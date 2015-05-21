#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""SchoolCMS-db."""

from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from tornado.options import options

from datetime import datetime

import sqlalchemy
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import INTEGER, BOOLEAN, CHAR, VARCHAR, ENUM, TIMESTAMP, TEXT
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

version = -100


# creat engine
engine = sqlalchemy.create_engine(options.database_config, 
                        echo=options.database_debug, pool_recycle=3600)
Base = declarative_base()
Session = sessionmaker(bind=engine)


class SessionGen(object):
    """This allows us to create handy local sessions simply with:
    with SessionGen() as session:
        session.do_something()
    and at the end the session is automatically rolled back and
    closed. If one wants to commit the session, they have to call
    commit() explicitly.
    """
    def __init__(self):
        self.session = None

    def __enter__(self):
        self.session = Session()
        return self.session

    def __exit__(self, unused1, unused2, unused3):
        self.session.rollback()
        self.session.close()


class TempFileList(Base):
    __tablename__ = 'tempfilelist'

    key = Column(CHAR(40, collation='utf8_unicode_ci'), primary_key=True)
    filename = Column(VARCHAR(100, collation='utf8_unicode_ci'), nullable=False)
    content_type = Column(VARCHAR(50, collation='utf8_unicode_ci'), nullable=False)
    created = Column(TIMESTAMP, default=datetime.now())
    
    def __init__(self, key, filename, content_type, **kwargs):
        self.key = key
        self.filename = filename
        self.content_type = content_type

    def __repr__(self):
        return 'TempFileList(%s ,%s)' % \
        (self.key,self.filename)

    @classmethod
    def by_key(cls, key, sql_session):
        q = sql_session.query(cls)
        return q.filter(cls.key == key)


class Post(Base):
    __tablename__ = 'posts'

    id = Column(INTEGER, primary_key=True)
    title = Column(CHAR(100, collation='utf8_unicode_ci'), nullable=False)
    content = Column(TEXT(charset='utf8'))
    created = Column(TIMESTAMP, default=datetime.now)
    audio_path = Column(TEXT(charset='utf8'), nullable=False)
    
    def __init__(self, title, content, audio_path, **kwargs):
        self.title = title
        self.content = content
        self.audio_path = audio_path

    def __repr__(self):
        return 'Post(%s ,%s)' % \
        (self.title,self.content)

    @classmethod
    def by_id(cls, id, sql_session):
        q = sql_session.query(cls)
        return q.filter(cls.id == id)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created': self.created.strftime("%Y-%m-%d %H:%M:%S"),
            'audio_path': self.audio_path,
        }


class Token(Base):
    __tablename__ = 'tokens'

    key = Column(CHAR(40, collation='utf8_unicode_ci'), primary_key=True)

    def __init__(self, key, **kwargs):
        self.key = key

    @classmethod
    def by_key(cls, key, sql_session):
        q = sql_session.query(cls)
        return q.filter(cls.key == key)


Base.metadata.create_all(engine)
