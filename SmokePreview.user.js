// ==UserScript==
// @name        SmokePreview
// @namespace   eu.rekisoft.smoker
// @description A Greasemonkey script to add a preview to chat messages of the SmokeDetector.
// @include     http://chat.meta.stackexchange.com/rooms/89/tavern-on-the-meta
// @version     1
// @grant       none
// ==/UserScript==

var target = document.querySelector('#chat');

var msgGroupObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if(mutation.addedNodes.length > 0) {
      processMessageNode(mutation.addedNodes[0]);
    }
  });
});

newMsgObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    try {
	  // the last group is not interesting anymore since there is a new group
      msgGroupObserver.disconnect();
    } catch(e) {}
	// process the new message
    processNewMessage(mutation);
    var lastMessage = target.getElementsByClassName("messages");
    lastMessage = lastMessage[lastMessage.length - 1];
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
  //console.log(user + " said " + msg);
  if(user == "SmokeDetector" && msg.innerHTML.indexOf("by")>0) {
    var code = msg.getElementsByTagName("code");
    if(code.length > 0) {
      var site = code[0].innerHTML.replace(".stackexchange.com", "").replace(".com", "");
      var post = msg.getElementsByTagName("a")[1].href;
      var type = (post.indexOf("questions") > 0) ? "questions" : "answers";
      var id = post.substr(post.lastIndexOf("/") + 1);
      var tag = '<div id="sd'+id+'" class="onebox ob-post" style="overflow-y:auto; max-height:150px"></div>';
      if(document.getElementById('sd'+id)==null) {
        msg.innerHTML+=tag;
      }
      //console.log(code[0].innerHTML + " -> " + site, type, id, msg);
      loadPreview(site, id);
    }
    //console.log(code[0].innerHTML, msg.innerHTML);
  }
}

function loadPreview(site, id) {
  var url = "http://api.stackexchange.com/2.2/posts/"+id+"?site="+site+"&filter=!LGnKKK-X0bbd*cixkZih*K&key=4JvEOlgm0aIgrcmo2hsbng((";
  //console.log("try to download "+ url);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.onload = showPreview;
  xhr.id=id;
  xhr.send();
}

function showPreview(response) {
  //console.log(response, this.response, this.id);
  var resp=JSON.parse(this.response);
  if(resp.items.length==0) {
    elem=document.getElementById("sd"+this.id);
    elem.style.display="none";
    elem.parentNode.style.opacity=.5;
  } else {
    var post = resp.items[0];
    document.getElementById("sd"+this.id).innerHTML=
      '<div title="This '+post.post_type+' has a score of '+post.score+'." class="ob-post-votes">'+post.score+'</div>' +
      '<div class="ob-post-title">'+post.post_type.substr(0,1).toUpperCase()+': <a href="'+post.link+'" style="color: #4E82C2;">'+post.title+'</a></div>' +
      '<p class="ob-post-body">' +
      '<img width="32" height="32" alt="'+post.owner.display_name+'" title="'+post.owner.display_name+'" src="'+post.owner.profile_image+'" class="user-gravatar32">' +
      resp.items[0].body + '</p>';
  }
}

// setup the observer configuration
observerConfig = { attributes: true, childList: true, characterData: true };

window.addEventListener('load', function() {
  var lastMessage = target.getElementsByClassName("messages");
  lastMessage = lastMessage[lastMessage.length - 1];
  msgGroupObserver.observe(lastMessage, observerConfig);
  newMsgObserver.observe(target, observerConfig);

  var nick = target.getElementsByClassName("username");
  if(nick.length > 0) {
    lastUser = nick[nick.length - 1].innerHTML;
  } else {
    lastUser = "unknown";
  }
  
  // parse existing messages
  var messageBlocks = target.getElementsByClassName("user-container");
  for(var i=0; i<messageBlocks.length; i++) {
    var user = messageBlocks[i].getElementsByClassName("username")[0].innerHTML;
    var messages = messageBlocks[i].getElementsByClassName("message");
    for(var j=0; j<messages.length; j++) {
      var message = messages[j].getElementsByClassName("content")[0];
      onMessage(user, message);
    }
  }
}, false);
