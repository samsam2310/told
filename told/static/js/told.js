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
      step: this.props.step,
      check: false,
    };
  },
  tabControl: function(step){
    return function(){
      this.setState({step: step});
    }.bind(this);
  },
  audioUploaded: function(status) {
    this.setState({
      'audiouploaded':status,
    });
  },
  submit: function(e){
    if(!this.state.title){
      e.preventDefault();
        this.setState({
        'inputblank':'error',
      });
    }
  },
  componentDidMount: function() {
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
  },
  render: function() {
    return (
      <RB.Grid>
        <RB.PageHeader>新增</RB.PageHeader>
        <form action='/new' method='POST' onSubmit={this.submit} ref='form' >
          <RB.Row>
            <RB.Col xs={12} md={12}>
              <RB.Well>
                <RB.TabbedArea activeKey={this.state.step}>
                  <RB.TabPane eventKey={1}>
                    <br/>
                    <div id='recaptcha'></div>
                    <RB.Button onClick={this.tabControl(2)}>Debug</RB.Button>
                  </RB.TabPane>
                  <RB.TabPane eventKey={2}>
                    <SC.AudioUpload dropstate={this.state.step===2} callback={this.audioUploaded}/>
                    <hr/>
                    <RB.Button onClick={this.tabControl(3)}>Debug</RB.Button>
                    <div className="btn-group btn-group-justified">
                      <a className={'btn btn-success'+(!this.state.audiouploaded?' disabled':'')} onClick={this.tabControl(3)}>下一步</a>
                    </div>
                  </RB.TabPane>
                  <RB.TabPane eventKey={3}>
                    <RB.Input type='hidden' name="_xsrf" value={_data._xsrf_token} />
                    <RB.Input type='text' bsStyle={this.state.inputblank} htmlFor={this.state.inputblank} name="title" valueLink={this.linkState('title')} className='floating-label' placeholder='標題(必填)' hasFeedback />
                    <RB.Input type='textarea' name="content" valueLink={this.linkState('content')} className='floating-label' placeholder='內容(可選)' rows="5" />
                    <div className="btn-group btn-group-justified">
                      <a className='btn btn-danger' onClick={this.tabControl(2)}>上一步</a>
                      <a className='btn btn-info' onClick={function(){React.findDOMNode(this.refs.form).submit();}.bind(this)}>送出</a>
                    </div>
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
  mixins: [RB.OverlayMixin],
  getInitialState: function() {
    return {
      audio_key: '',
      percent: -1,
      filename: '',
    };
  },
  upload: function(file){
    if(file.size>100000000){
      this.setState({
        alert: '檔案過大，檔案大小上限為100MB',
      });
      return;
    }
    if(this.state.audio_key){
      this.props.callback(false);
      var xhr = new XMLHttpRequest();
      xhr.open('DELETE','/fileupload/'+this.state.audio_key,false);
      var form = new FormData();
      form.append('_xsrf',_data._xsrf_token);
      xhr.send(form);
    }
    var form = new FormData();
    this.xhr = new XMLHttpRequest();

    this.setState({
      filename: file.filename,
      percent: 0.0,
    });

    form.append('file',file);
    form.append('_xsrf',_data._xsrf_token);
    this.xhr.open('POST','/fileupload',true);
    this.xhr.onreadystatechange = function(){
      if(this.xhr.readyState==4){
        if(this.xhr.status==200){
          audiofile = JSON.parse(this.xhr.responseText);
          console.log(audiofile);
          this.setState({
            audio_key: audiofile.key,
            percent: audiofile.key?101:-1,
            alert: audiofile.error_msg,
          });
          this.props.callback(audiofile.key);
        }else{
          this.setState({
            percent: -1,
            alert: '發生錯誤，請重新整理網頁',
          });
          this.props.callback(false);
        }
      }
    }.bind(this);
    this.xhr.upload.onprogress = function(e){
      if(e.lengthComputable){
        this.setState({percent: e.loaded*100 / e.total});
      }
    }.bind(this);
    this.xhr.send(form);
  },
  abort: function(){
    this.xhr.abort();
    this.setState({
      percent: -1,
    });
    this.props.callback(false);
  },
  audioBar: function(){
    if(this.state.percent>100){
      return (<audio controls><source src={'/file/tmp/'+this.state.audio_key}/></audio>);
    }
  },
  progressBar: function(){
    if(this.state.percent>100||this.state.percent<0){
      var uploadButton = {
        overflow:'hidden',
        position: 'relative',
        width: '100%',
      };
      var uploadInput = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        opacity: 0,
      };
      var uploadIcon = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
      };
      return (
        <div className='btn btn-default btn-lg btn-material-grey-300 mdi-content-add' style={uploadButton}>
          <input ref='inputFile' style={uploadInput} type='file' onChange={function(e){this.upload(e.target.files[0]);}.bind(this)}/>
        </div>
      );
    }else{
      return (
        <div>
          <RB.ProgressBar active now={this.state.percent} label='%(percent)s%'/>
          <RB.Button bsStyle='danger' onClick={this.abort}>取消</RB.Button>
        </div>
      );
    }
  },
  alert: function(){
    if(this.state.alert){
      return (
        <Alert bsStyle='danger' onDismiss={function(){this.setState({alert:''});}.bind(this)}>
          <h4>錯誤！</h4>
          <p>{this.state.alert}</p>
        </Alert>
      );
    }
  },
  componentWillMount: function() {
    window.ondragover = function(e){
      e.stopPropagation();
      e.preventDefault();
      if(!this.props.dropstate||this.state.percent>=0&&this.state.percent<=100)return;
      this.setState({drop:true});
    }.bind(this);
    window.ondragleave = function(e){
      e.stopPropagation();
      e.preventDefault();
      if(!this.props.dropstate||this.state.percent>=0&&this.state.percent<=100)return;
      this.setState({drop:false});
    }.bind(this);
    window.ondragend = function(e){
      e.stopPropagation();
      e.preventDefault();
      if(!this.props.dropstate||this.state.percent>=0&&this.state.percent<=100)return;
      this.setState({drop:false});
    }.bind(this);
    window.ondrop = function(e){
      e.stopPropagation();
      e.preventDefault();
      if(!this.props.dropstate||this.state.percent>=0&&this.state.percent<=100)return;
      this.setState({drop:false});
      var files = e.dataTransfer.files;
      if(files.length>0){
        this.upload(files[0])
      }
    }.bind(this);
  },
  render: function() {
    return (
      <div>
        <RB.Input type='hidden' name="audio_key" value={this.state.audio_key}/>
        <h4>上傳聲音檔</h4>
        <p className="text-muted">點選按鈕或是拖曳檔案</p>
        {this.alert()}
        {this.audioBar()}
        {this.progressBar()}
      </div>
    );
  },
  renderOverlay: function() {
    if(this.state.drop){
      return (
        <RB.Modal onRequestHide={function(){return false;}}>
          <div className='modal-body well-info'>
            <Alert bsStyle='info'>
              <h2>上傳音訊檔案</h2>
            </Alert>
          </div>
        </RB.Modal>
      );
    }else{
      return <span/>;
    }
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
