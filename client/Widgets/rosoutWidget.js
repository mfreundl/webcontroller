/**
 *  @file rosoutWidget - Handle rosout messages like in rqt_console
 *  @author Martin Freundl
 */

widgetList.push("rosoutWidget");

  /**
   *  Creates an instance of the rosoutWidget
   *  @extends widgetBase
   *  @param {Object} config - object containing some default or saved configurations
   */
function rosoutWidgetObject(config)
{
  widgetBase.apply(this, [config]);
  var that = this;

  that.title = "RosoutWidget";
  that.description = "<p>Displays rosout messages depending on the dropped node and filter settings.</p>";
  that.m_template = _.template("<table id='rosoutTable'><tr><th class='rosout_number'>#</th><th class='rosout_message'>Message</th><th class='rosout_stamp'>Stamp</th><th class='rosout_node'>Node</th><th class='rosout_level'>Level</th><th class='rosout_topics'>Topics</th></tr></table>");
  that.m_templateEntry = _.template("<tr><td class='rosout_number'><%= number %></td><td class='rosout_message'><%= msg %></td><td class='rosout_stamp'><%= stamp %></td><td class='rosout_node'><%= node %></td><td class='rosout_level'><%= level %></td><td class='rosout_topics'><%= topics %></td></tr>");
  that.m_counter = 0;
  


  /**************** METHODS ****************/
  this.createWidget = function() 
  {
    // DOM elements
    this.myDiv.droppable({
        accept:'#menuNode li',
        drop:handleDropRosoutWidget,
        hoverClass:'hovered'
      })
      
    that.m_observedNodes = $("<div><p>Observed Nodes:</p></div>").appendTo(that.contentDiv);
  }

  this.render = function()
  {
    // Configuration
    if (config.content == undefined)
      config.content = Object();
    that.contentObject = _.defaults(that.contentObject, {nodes: [], options: { exclude_filter: {regExp: "", topics : "", debug: false, info: false, warn: false, error: false, fatal: false}, highlight_filter: {regExp: "", topics : "", debug: false, info: false, warn: false, error: false, fatal: false} } });

    if(that.contentObject.nodes)
    {
      $.each(that.contentObject.nodes, function(key, value){
        insertNode(value, false);
      });
    }
      
    // Init
    that.contentDiv.append($(that.m_template()));
    
    that.getTopicTypeByTopicString(that.myRosHandle, "/rosout", function(topicType){
      that.getRosTopicInstance(that.myRosHandle, "/rosout", topicType, function(instance){
        that.m_instance = instance;
        that.m_instance.subscribe(function(message){processMessage(message);});
      });
    });
  }
  
  function processMessage(message)
  {
    //check if message belongs to a node that has been dropped onto the widget
    var nodeMatch = false;
    $.each(that.contentObject.nodes, function(key, value){
      if(value == message.name)
      {
        nodeMatch = true;
      }
    });
    
    if(!nodeMatch)
    {
      return;
    }
    
    
    //find out if message should be excluded
    //level match
    var eF = that.contentObject.options.exclude_filter;
    var excludeLevel = (eF.debug << 0) | (eF.info << 1) | (eF.warn << 2) | (eF.error << 3) | (eF.fatal << 4);
    var check = excludeLevel | message.level;
    if(excludeLevel == check)
    {
      return;
    }
    //topic match
    var excludeTopicMatch = false;
    var excludedTopics = that.contentObject.options.exclude_filter.topics.split(", ");
    $.each(message.topics, function(key, val){
      $.each(excludedTopics, function(_key, _val){
        if(val == _val)
        {
          excludeTopicMatch = true;
        }
      });
    });
    
    if(excludeTopicMatch)
    {
      return;
    }
    //regexp match
    var excludeRegExpMatch = message.msg.match(that.contentObject.options.exclude_filter.regExp)
    if(excludeRegExpMatch && that.contentObject.options.exclude_filter.regExp !== "")
    {
      return;
    }
    
    //find out if message should be highlighted
    //level match
    var highlight = false;
    var hF = that.contentObject.options.highlight_filter;
    var highlightLevel = (hF.debug << 0) | (hF.info << 1) | (hF.warn << 2) | (hF.error << 3) | (hF.fatal << 4);
    var check = highlightLevel | message.level;
    if(highlightLevel == check)
    {
      highlight = true;
    }
    //topic match
    var highlightTopicMatch = false;
    var highlightedTopics = that.contentObject.options.highlight_filter.topics.split(", ");
    $.each(message.topics, function(key, val){
      $.each(highlightedTopics, function(_key, _val){
        if(val == _val)
        {
          highlightTopicMatch = true;
        }
      });
    });
    
    if(highlightTopicMatch)
    {
      highlight = true;
    }
    //regexp match
    var highlightRegExpMatch = message.msg.match(that.contentObject.options.highlight_filter.regExp)
    if(highlightRegExpMatch && that.contentObject.options.highlight_filter.regExp !== "")
    {
      highlight = true;
    }
    
    displayMessage(message, highlight)
  }
  
  function displayMessage(message, highlight)
  {
    var _Date = new Date(message.header.stamp.secs * 1000);  //Javascript Timestamp contains milliseconds
    var timeString = sprintf("%02d", _Date.getHours())+":"+sprintf("%02d", _Date.getMinutes())+":"+sprintf("%02d", _Date.getSeconds());    
    var _level = "";
    if(message.level == 1)
    {
      _level = "Debug";
    }
    else if(message.level == 2)
    {
      _level = "Info";
    }
    else if(message.level == 4)
    {
      _level = "Warn";
    }
    else if(message.level == 8)
    {
      _level = "Error";
    }
    else if(message.level == 16)
    {
      _level = "Fatal";
    }
    
    var _topics = message.topics.join(", ");
    
    try {$("#rosoutTable").colResizable({disable: true});} catch(e) {console.log(e);}
      
    $(that.m_templateEntry({number:that.m_counter++, msg:message.msg, stamp:timeString, node:message.name, level:_level, topics:_topics}))
    .css("background", highlight ? "red" : "none")
    .insertAfter($("#rosoutTable tr:first-child"))

    $("#rosoutTable").colResizable({liveDrag: true, gripInnerHtml:"<div class='fa fa-chevron-down'></div>"})
  }

  this.cleanMeUp = function()
  {
    // @todo Clean everything
    console.log("done");
    if(that.m_instance != undefined)
    {
      that.m_instance.unsubscribe();
    }
    that.myRosHandle.close();
    //the documentation of colresizable says to disable their functionality before removing the table from the DOM
    try {$("#rosoutTable").colResizable({disable: true});} catch(e) {console.log(e);}
  }
  

  this.wakeMeUp = function()
  {
    //rerendering the table with the right relative scales
    //necessary when the widget has been resized to a smaller width. changing the width of the table does not work in that case (because the tds do not shrink)
    //Here the table is given the right width and the tds will get reappended their class containing their relative width
    $("#rosoutTable").css("width", that.myDiv.css("width"))
    $("#rosoutTable .rosout_number").addClass("rosout_number");
    $("#rosoutTable .rosout_message").addClass("rosout_message");
    $("#rosoutTable .rosout_stamp").addClass("rosout_stamp");
    $("#rosoutTable .rosout_level").addClass("rosout_level");
    $("#rosoutTable .rosout_node").addClass("rosout_node");
    $("#rosoutTable .rosout_topics").addClass("rosout_topics");
    
    //colResizable will rescale the grips on this event
    window.setTimeout(function() {$(window).resize();}, 100);
  }


  function insertNode(nodeString, updating)
  {
    $("#help", that.contentDiv).remove();
    
    if(!updating)
    {
      $("<button title='remove this node'>"+nodeString+"  <span class='fa fa-trash-o'></span></button>").appendTo(that.m_observedNodes).click(function(){handleNodePress($(this).get(0).innerHTML); $(this).remove();});
    }
    else
    {    
      var alreadyInserted = false;
      $.each(that.contentObject.nodes, function(key, value){
          if(value === nodeString)
            alreadyInserted = true;
      });
      
      if(!alreadyInserted)
      {
        that.contentObject.nodes.push(nodeString);
        $("<button title='remove this node'>"+nodeString+"  <span class='fa fa-trash-o'></span></button>").appendTo(that.m_observedNodes).click(function(){handleNodePress($(this).get(0).innerHTML); $(this).remove();});
      }
    }  
  }
  
  function handleNodePress(nodeString)
  {
    $.each(that.contentObject.nodes, function(key, val){
      if(val == nodeString)
      {
        delete that.contentObject.nodes[key];
      }
    });
  }
  
  
  /** @summary Callback for dropped objects */
  function handleDropRosoutWidget(event, ui)
  { 
    var draggable = ui.draggable;
    insertNode(draggable.data('value'), true);
  }
}
