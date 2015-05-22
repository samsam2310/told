#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""SchoolCMS-handler-init.

route.
"""

from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import functools
import os
import subprocess
import uuid
import requests

import tornado.web
from tornado.web import StaticFileHandler
from tornado.escape import json_encode

from told.db import Session, Post, TempFileList, Token

try:
    xrange
except NameError:
    xrange = range


class BaseHandler(tornado.web.RequestHandler):
    def initialize(self, api=False):
        self.api = api

    def prepare(self):
        """This method is executed at the beginning of each request.

        """
        self.sql_session = Session()

    def on_finish(self):
        """Finish this response, ending the HTTP request 
        and properly close the database.
        """
        self.sql_session.close()

    def get_template_namespace(self):
        _ = super(BaseHandler, self).get_template_namespace()
        _['_xsrf_token'] = self.xsrf_token
        return _

    @property
    def HTTPError(self):
        return tornado.web.HTTPError
    
    def write_error(self, error, **kargs):
        self.write('<p style="font-size:150px;">Geez! %d!</h1>' % error)

    @staticmethod
    def authenticated(method):
        return tornado.web.authenticated(method)


class IndexHandler(BaseHandler):
    def get(self):
        start = self.get_argument('start', '')
        if not start.isdigit():
            start = 0
        start = int(start)

        total = self.sql_session.query(Post.id).count()
        q = self.sql_session.query(Post)
        q = q.order_by(Post.created.desc())
        q = q.offset(start).limit(10)
        posts = q.all()

        if self.api:
            self.write({
                    'total': total,
                    'start': start,
                    'posts': [{
                            'title': post.title,
                            'id' : post.id,
                            'created' : post.created.strftime("%Y-%m-%d %H:%M:%S"),} for post in posts],
                })
        else:
            self.render('index.html',posts=posts, total=total, start=start)


class PostHandler(BaseHandler):
    def get(self, id):
        post = Post.by_id(id, self.sql_session).scalar()

        if self.api:
            self.write({
                    'post': post.to_dict(),
                })
        else:
            self.render('post.html', post=post)


class NewPostHandler(BaseHandler):
    def get(self):
        key = self.get_secure_cookie('token');
        token = Token.by_key(key, self.sql_session).scalar()
        self.render('newpost.html', token=token)

    def post(self):
        self._ = dict()
        self._['title'] = self.get_argument('title', '')
        self._['content'] = self.get_argument('content', '')
        self._['audio_key'] = self.get_argument('audio_key', '')

        key = self.get_secure_cookie('token');
        token = Token.by_key(key, self.sql_session).scalar()
        if not token:
            raise self.HTTPError(403)

        if not self.check_post():
            raise self.HTTPError(403)

        if not os.path.exists('file/%s' % self.audio.key):
            os.makedirs('file/%s' % self.audio.key)
        os.rename('file/tmp/%s' % self.audio.key, 'file/%s/%s' % (self.audio.key, self.audio.filename))

        self._['audio_path'] = '%s/%s' % (self.audio.key, self.audio.filename)

        new_post = Post(**self._)
        self.sql_session.add(new_post)
        Token.by_key(key, self.sql_session).delete()
        self.set_secure_cookie('token','')
        self.sql_session.commit()
        self.redirect('/')

    def check_post(self):
        if not self._['audio_key']:
            return False
        else:
            q = self.sql_session.query(TempFileList)
            q = q.filter(TempFileList.key == self._['audio_key'])
            try:
                new_audio = q.one()
                assert os.path.exists('file/tmp/%s' % new_audio.key)
                self.audio = new_audio
            except:
                return False

        if not self._['title']:
            return False

        return True


class TempUploadHandler(BaseHandler):
    def prepare(self):
        super(TempUploadHandler, self).prepare()

        if not os.path.exists('file'):
            os.makedirs('file')
        if not os.path.exists('file/tmp'):
            os.makedirs('file/tmp')

        self.tmp_file_name = '%s' % uuid.uuid1().hex

    def post(self, path):
        if path:
            raise self.HTTPError(404)
        if not self.request.files.get('file'):
            raise self.HTTPError(403)

        key = self.get_secure_cookie('token');
        token = Token.by_key(key, self.sql_session).scalar()
        if not token:
            raise self.HTTPError(403)

        filename = self.request.files['file'][0]['filename']
        body = self.request.files['file'][0]['body']

        audio_content_type = ['audio/mpeg\n','audio/vnd.wav\n']

        try:
            with open('file/tmp/%s' % self.tmp_file_name, 'wb') as f:
                f.write(body)

            content_type = subprocess.check_output('file -b --mime-type file/tmp/%s' % self.tmp_file_name, shell=True)
            assert content_type in audio_content_type

            new_file = TempFileList(self.tmp_file_name, filename, content_type)
            self.sql_session.add(new_file)
        except:
            os.remove('file/tmp/%s' % self.tmp_file_name)
            if not content_type in audio_content_type:
                return self.write({'error_msg':'這不是音訊檔。我們只接受mp3、wav格式的音訊檔。'})
            raise self.HTTPError(403)

        self.sql_session.commit()
        self.write({'file_name':filename,'key':self.tmp_file_name})

    def delete(self, path):
        key = self.get_secure_cookie('token');
        token = Token.by_key(key, self.sql_session).scalar()
        if not token:
            raise self.HTTPError(403)

        deletefile = TempFileList.by_key(path, self.sql_session).scalar()
        if not deletefile:
            raise self.HTTPError(404)
        if os.path.exists('file/tmp/%s' % deletefile.key):
            os.remove('file/tmp/%s' % deletefile.key)

        self.write('delete!')


class TokenHandler(BaseHandler):
    def post(self):
        self.check_robot = self.get_argument('g-recaptcha-response', '')
        data = {
            'secret': '6LdjLwcTAAAAALS0urCYDE6e_anHqBW8uCGLMCMh',
            'response': self.check_robot,
        }
        r = requests.post('https://www.google.com/recaptcha/api/siteverify', data=data)
        if not r.json()['success']:
            raise self.HTTPError(403)

        new_token = Token(key=uuid.uuid4().hex)
        self.sql_session.add(new_token)
        self.sql_session.commit()
        self.set_secure_cookie('token',new_token.key)


route = [
    (r'/', IndexHandler),
    # (r'/login/?', LoginHandler),
    # (r'/logout/?', LogoutHandler),
    # (r'/admin/adduser/?', AddUserHandler),
    (r'/([0-9]+)/?', PostHandler),
    (r'/new/?', NewPostHandler),
    (r'/file/(.*)', StaticFileHandler, {"path": os.path.join(os.path.dirname(__file__), '../../file')}),
    (r'/fileupload(?:/([a-zA-Z0-9]+))?/?', TempUploadHandler),
    (r'/token/?', TokenHandler),

    (r'/api/?', IndexHandler, {'api':True}),
    (r'/api/([0-9]+)/?', PostHandler, {'api':True}),
]
