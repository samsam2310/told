/** @jsx React.DOM */

const RB = ReactBootstrap;
var Alert = RB.Alert;
var SC = {}


SC.NavbarInstance = React.createClass({
  render: function(){
    return (
      <RB.Navbar brand={<a href="/">Told</a>} inverse toggleNavKey={0}>
        <RB.Nav right eventKey={0}> {/* This is the eventKey referenced */}
        </RB.Nav>
      </RB.Navbar>
    );
  },
});


SC.PostIndexPage = React.createClass({
  render: function() {
    var postItems = this.props.postlist.map(function (post) {
      return (
        <tr key={post.id}>
          <td><a href={'/'+post.id}>{post.title}</a></td>
          <td>{post.created}</td>
        </tr>
      );
    });
    return (
      <RB.Grid>
        <RB.Row>
          <RB.Col xs={12} md={12}>
            <h1>JIZZ</h1>
            <a href="/new">New</a>
          </RB.Col>
        </RB.Row>
        <RB.Row><RB.Col xs={12} md={12}>
          <RB.Well>
            <RB.Table striped bordered hover>
              <thead>
                <tr><th>標題</th><th>時間</th></tr>
              </thead>
              <tbody>{postItems}</tbody>
            </RB.Table>
          </RB.Well>
          {<SC.Pager start={this.props.start} totle={this.props.total} />}
        </RB.Col></RB.Row>
      </RB.Grid>
    );
  }
});


SC.Pager = React.createClass({
  pageUrl: function(start){
    return '/?start='+start;
  },
  render: function() {
    var max = function(a,b){return a>b?a:b;};
    var min = function(a,b){return a<b?a:b;};
    return (  
      <RB.Pager>
        <RB.PageItem previous href={this.pageUrl(max(0,this.props.start-10))} disabled={this.props.start<=0} >&larr; Previous Page</RB.PageItem>
        <RB.PageItem next href={this.pageUrl(this.props.start+10)} disabled={this.props.start+10>=this.props.totle} >Next Page &rarr;</RB.PageItem>
      </RB.Pager>
    );
  }
});


SC.NewPostPage = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  getInitialState: function() {
    return {
      step: 1,
      check: false,
    };
  },
  tabControl: function(step){
    return function(){
      this.setState({step: step});
    }.bind(this);
  },
  audioUploaded: function() {
    this.setState({
      'audiouploaded':true,
    })
  },
  submit: function(e){
    if(!this.state.title || !this.state.content){
      e.preventDefault();
    }
  },
  render: function() {
    window.verifyCallback = function(response){
      var xhr = new XMLHttpRequest();
      xhr.open('POST','/token',true);
      var form = new FormData();
      form.append('g-recaptcha-response',response);
      form.append('_xsrf', _data._xsrf_token);
      xhr.onreadystatechange = function(){
      if(xhr.readyState==4&&xhr.status==200){
          this.setState({step: 2});
        }
      }.bind(this);
      xhr.send(form);
    }.bind(this);
    return (
      <RB.Grid>
        <RB.PageHeader>新增</RB.PageHeader>
        <form action='/new' method='POST' onSubmit={this.submit} ref='form' >
          <RB.Row>
            <RB.Col xs={12} md={12}>
              <RB.Well>
                <RB.TabbedArea activeKey={this.state.step}>
                  <RB.TabPane eventKey={1}>
                    <div id='recaptcha'>
                      <img src='/static/loading.gif' />
                    </div>
                  </RB.TabPane>
                  <RB.TabPane eventKey={2}>
                    <SC.AudioUpload callback={this.audioUploaded}/>
                    <RB.Button disabled={!this.state.audiouploaded} onClick={this.tabControl(3)}>next</RB.Button>
                  </RB.TabPane>
                  <RB.TabPane eventKey={3}>
                    <RB.Input type='hidden' name="_xsrf" value={_data._xsrf_token} label="公告標題" placeholder='輸入公告標題' />
                    <RB.Input type='text' name="title" valueLink={this.linkState('title')} label="公告標題" placeholder='輸入公告標題' />
                    <RB.Input type='textarea' name="content" valueLink={this.linkState('content')} label="公告內容" placeholder='輸入公告內容' />
                    <RB.Button onClick={this.tabControl(2)}>return</RB.Button>
                    <RB.Input type='submit'/>
                  </RB.TabPane>
                </RB.TabbedArea>
              </RB.Well>
            </RB.Col>
          </RB.Row>
        </form>
      </RB.Grid>
    );
  }
});


SC.AudioUpload = React.createClass({
  getInitialState: function() {
    return {
      audio_key: '',
      percent: -1,
      filename: '',
    };
  },
  handleChange: function(evt) {
    if(this.state.audio_key){
      var xhr = new XMLHttpRequest();
      xhr.open('DELETE','/fileupload/'+this.state.audio_key,false);
      var form = new FormData();
      form.append('_xsrf',_data._xsrf_token);
      xhr.send(form);
    }
    var file = evt.target.files[0];
    var form = new FormData();
    var xhr = new XMLHttpRequest();

    this.setState({
      filename: file.filename,
      percent: 0.0,
    });

    form.append('file',file);
    form.append('_xsrf',_data._xsrf_token);
    xhr.open('POST','/fileupload',true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState==4&&xhr.status==200){
        audiofile = JSON.parse(xhr.responseText);
        // this.props.newUpload({
        //   'filename': attfile.file_name,
        //   'key': attfile.key,
        // });
        console.log(audiofile);
        this.setState({
          audio_key: audiofile.key,
          percent: audiofile.key?101:-1,
        });
        if(audiofile.key){
          this.props.callback();
        }
      }
    }.bind(this);
    xhr.upload.onprogress = function(e){
      if(e.lengthComputable){
        this.setState({percent: e.loaded*100 / e.total});
      }
    }.bind(this);
    xhr.send(form);
  },
  audioBar: function(){
    if(this.state.percent>100){
      return (<audio controls><source src={'/file/tmp/'+this.state.audio_key}/></audio>);
    }
  },
  progressBar: function(){
    if(this.state.percent>100){
      return (
        <i className="mdi-content-add">
          <RB.Input type='file' label='File' help='GG' onChange={this.handleChange}/>
        </i>
      );
    }else if(this.state.percent<0){
      return (
        <div ClassName="icon-preview" style={{overflow:'hidden'}}>
          <i className="mdi-content-add">
            <RB.Input style={{opacity:0}} type='file' onChange={this.handleChange}/>
          </i>
        </div>
      );
    }else{
      return (
        <RB.ProgressBar active now={this.state.percent} label='%(percent)s%'/>
      );
    }
  },
  render: function() {
    return (
      <div>
        <RB.Input type='hidden' name="audio_key" value={this.state.audio_key}/>
        {this.audioBar()}
        {this.progressBar()}
      </div>
    );
  }
});


SC.PostPage = React.createClass({
  render: function() {
    return (
      <RB.Grid>
        <RB.PageHeader>聲音</RB.PageHeader>
        <RB.Row>
          <RB.Col xs={12} md={12}>
            <RB.Well>
              {this.props.post.title}
              <hr/>
              {this.props.post.content}
              <br/>
              <audio controls><source src={'/file/'+this.props.post.audio_path}/></audio>
            </RB.Well>
          </RB.Col>
        </RB.Row>
      </RB.Grid>
    );
  }
});
