// ==UserScript==
// @name        SmokePreview
// @namespace   eu.rekisoft.smoker
// @description A GreaseMonkey script to add a preview to chat messages of the SmokeDetector.
// @include     http://chat.meta.stackexchange.com/rooms/89/tavern-on-the-meta
// @include     http://chat.stackexchange.com/rooms/11540/charcoal-hq
// @include     http://rekire.github.io/SmokePreview/auth.html
// @version     15122902
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

unsafeWindow.sp_load = GM_getValue;
unsafeWindow.sp_save = GM_setValue;

// some special handling for the login flow. I need to store the access
// key so I need to be informed which I try to do here.
if(location.href == "http://rekire.github.io/SmokePreview/auth.html") {
  var publicApi = function() {
    invokeLogin = function() {
      login(function(data) {
        console.log("Wohoo", data);
        for(var i = 0; i<data.networkUsers.length; i++) {
          var acc = data.networkUsers[i];
          sp_save(acc.site_url.substr(acc.site_url.indexOf('//') + 2), acc.reputation);
          sp_save("token", data.accessToken);
        }
        //
      }, function(data) {
        console.log("oh no!", data);
      });
    }
  }
    
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + publicApi + ')();'));
  document.body.appendChild(script);
  document.body.className = "dlg";
  document.getElementsByClassName("project-tagline")[0].innerHTML = "Please login to continue.";
  document.getElementById("output").innerHTML = "Please click on the Authorizate App button above.";
  return;
}

var target = document.getElementById('chat');
var lastUser;
var printToConsole = false;

var msgGroupObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if(mutation.addedNodes.length > 0) {
      processMessageNode(mutation.addedNodes[0]);
    }
  });
});

var newMsgObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    try {
	  // the last group is not interesting anymore since there is a new group
      msgGroupObserver.disconnect();
    } catch(e) {}
    // process the new message
    processNewMessage(mutation);
    var messageList = target.getElementsByClassName("messages");
    var lastMessage = messageList[messageList.length - 1];
    msgGroupObserver.observe(lastMessage, observerConfig);
  });    
});

function processNewMessage(mutation) {
  try {
    lastUser = mutation.addedNodes[0].getElementsByClassName("username")[0].innerHTML;
    var message = mutation.addedNodes[0].getElementsByClassName("content")[0];
    onMessage(lastUser, message);
  } catch(e) {}
}

function processMessageNode(node) {
  try {
    var message = node.getElementsByClassName("content")[0];
    onMessage(lastUser, message);
  } catch(e) {}
}

function onMessage(user, msg) {
  if(printToConsole) console.log(user + " said " + msg.innerHTML);
  if(user == "SmokeDetector" && msg.innerHTML.indexOf("by") > 0) {
    var code = msg.getElementsByTagName("code");
    if(code.length > 0) {
      var site = code[0].innerHTML;
      var post = msg.getElementsByTagName("a")[1].href;
      var type = (post.indexOf("questions") > 0) ? "questions" : "answers";
      var id = post.substr(post.lastIndexOf("/") + 1);
      var tag = '<div id="sd' + id + '" class="onebox ob-post" style="overflow-y:auto; max-height:150px; margin-bottom:2em"></div>';
      if(document.getElementById('sd'+id) == null) {
        msg.innerHTML += tag;
      }
      if(printToConsole) console.log(code[0].innerHTML + " -> " + site, type, id, msg);
      // TODO check if the current user has an account on that site.
      loadPreview(site, id);
    }
    if(printToConsole) console.log(code[0].innerHTML, msg.innerHTML);
  }
}

function loadPreview(site, id) {
  var url = "http://api.stackexchange.com/2.2/posts/" + id + "?site=" + site + "&filter=!LGnKKK-X0bbd*cixkZih*K&key=4JvEOlgm0aIgrcmo2hsbng((";
  if(printToConsole) console.log("try to download " + url);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.onload = showPreview;
  xhr.id = id;
  xhr.send();
}

function showPreview(response) {
  if(printToConsole) console.log(response, this.response, this.id);
  var resp = JSON.parse(this.response);
  if(resp.items.length == 0) {
    var elem = document.getElementById("sd" + this.id);
    elem.style.display = "none";
    elem.parentNode.style.opacity = .5;
  } else {
    var post = resp.items[0];
	var link = document.createElement('a');
    link.setAttribute('href', post.link);
    document.getElementById("sd" + this.id).innerHTML =
      '<div title="This ' + post.post_type + ' has a score of ' + post.score +
      '." class="ob-post-votes">' + post.score + '</div>' +
      '<div class="ob-post-title">' + post.post_type.substr(0, 1).toUpperCase() +
      ': <a href="' + post.link + '" style="color: #4E82C2;">' + post.title +
      '</a></div><p class="ob-post-body"><img width="32" height="32" alt="' + post.owner.display_name +
      '" title="' + post.owner.display_name + '" src="' + post.owner.profile_image +
      '" class="user-gravatar32">' + resp.items[0].body + '</p>' +
      '<div class="toolbar" style="position:absolute; bottom: 0px;">' +
      //'<span class="more" onclick="authSmokePreview();">Auth test</span> ' +
      '<span class="more spam" onclick="markAsSpam(\'' + post.post_type + '\', \'' + link.hostname + '\', \'' +
      post.post_id + '\');" style="color:red;">Flag as SPAM</span></div>';
  }
}

// setup the observer configuration
var observerConfig = { attributes: true, childList: true, characterData: true };

window.addEventListener('load', function() {
  if(printToConsole) console.log("init");
  var messageList = target.getElementsByClassName("messages");
  var lastMessage = messageList[messageList.length - 1];
  msgGroupObserver.observe(lastMessage, observerConfig);
  newMsgObserver.observe(target, observerConfig);

  var nick = target.getElementsByClassName("username");
  lastUser = nick.length > 0
                 ? nick[nick.length - 1].innerHTML
                 : "unknown";
  
  // parse existing messages
  var messageBlocks = target.getElementsByClassName("user-container");
  for(var i = 0, messageBlocksLength = messageBlocks.length; i < messageBlocksLength; i++) {
    var user = messageBlocks[i].getElementsByClassName("username")[0].innerHTML;
    var messages = messageBlocks[i].getElementsByClassName("message");
    for(var j = 0, messagesLength = messages.length; j < messagesLength; j++) {
      var message = messages[j].getElementsByClassName("content")[0];
      onMessage(user, message);
    }
  }
  
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + publicApi + ')();'));
  (document.head || document.body || document.documentElement).appendChild(script);
}, false);

function publicApi() {
  authSmokePreview = function() {
    authWin = window.open("http://rekire.github.io/SmokePreview/auth.html", "SmokeAuth", "width=400,height=300,scrollbars=1");
  }
  markAsSpam = function(type, site, id) {
    var token = sp_load("token");
    if(token == null) {
      console.log("Asking for permission...");
      authSmokePreview();
      lastSpam = {};
      lastSpam.type = type;
      lastSpam.site = site;
      lastSpam.id = id;
      setTimeout(authWinCloseListener, 100);
      return;
    }
    console.log("Marking " + type + " " + id + " on " + site + " as spam");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.stackexchange.com/2.2/" + type + "s/" + id + "/flags/add", true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function(data) {
      var resp = JSON.parse(this.response);
      console.log("Got flag response: ", resp);
      if(resp.items != null && resp.items.length>0) {
        var id = resp.items[0].question_id || resp.items[0].answer_id;
        var container = document.getElementById("sd" + id);
        container.style.display = "none";
        container.parentNode.innerHTML += ' ✔';
        container.parentNode.style.opacity = .5;
      }
    }
    xhr.send("access_token=ZAa1xBHAC(jaTmXnsGcDfg))&key=4JvEOlgm0aIgrcmo2hsbng((&option_id=46534&preview=false&filter=!)5IW-5QuertpO1qiYmpsZQ8hEo.Y&site=" + site);
  }
  authWinCloseListener = function() {
    if(authWin.closed || sp_load("token") != null) {
      if(sp_load("token") != null) {
        markAsSpam(lastSpam.type, lastSpam.site, lastSpam.id);
      } else {
        console.log("Auth failed.")
      }
      lastSpam = null;
    } else {
      setTimeout(authWinCloseListener, 100);
    }
  }
}
