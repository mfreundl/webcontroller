/**
 *  @file sliderWidget - Show numeric values of messages with sliders
 *  @author Nicolas Alt
 */

widgetList.push("sliderWidget");

  /**
   *  Creates an instance of the sliderWidget
   *  @extends widgetBase
   *  @param {Object} config - object with key content.items - array of sliders
   */
function sliderWidgetObject(config)
{
  widgetBase.apply(this, [config]);
  var that = this;

  this.title = "Sliders";
  this.description = "<p>Displays numeric fields of ROS messages with sliders</p>";
  this.m_template = _.template("<div class='slidercontainer deleteableEntry'>"+
    "<div id='slider'></div><div class='tl'><b><%= name %></b></div><div class='tr' id='val'></div>"+
    "<div class='bl weak' id='min'><%= min %></div><div class='br weak' id='max'><%= max %></div>");

  this.use_viewmodes = 2;
  var listOfTopicObjects = new Object();
  
  // Configuration
  if (config.content == undefined)
    config.content = Object();
  that.contentObject = _.defaults(config.content, {items: [], options: { flash_message: false } });


  /**************** METHODS ****************/
  this.createWidget = function() 
  {
    // DOM elements
    this.myDiv.droppable({
        accept:'#menuTopic li',
        drop:handleDropTopicWidget,
        hoverClass:'hovered'
      })
  }

  this.loadMe = function()
  {
    this.contentObject = _.defaults(this.contentObject, {items: [], options: { flash_message: false } });

    // Init
    this.m_sliderman = new SliderManager(this.contentObject.items, this.m_template);
    this.m_sliderman.load();
  }

  this.cleanMeUp = function()
  {
    // @todo Clean everything
    console.log("done");
    $.each(listOfTopicObjects, function(key, obj){
      obj.m_topicObject.unsubscribe();
      delete obj.m_topicObject;
      delete listOfTopicObjects[key];
    });
    that.myRosHandle.close();
  }
  

  /** @summary Create new flatTopic object and setup callbacks to Slidermanager
   *  @param   create_sliders  Also create sliders for all fields in the topic
   *  Checks if topic already exists */
  function addTopic(topicString, create_sliders)
  {
    if (listOfTopicObjects[topicString]) {
        return;
    }
    var myTopic = new flatTopic(topicString, that.m_sliderman.cbData, (create_sliders)? that.m_sliderman.createOne : null);
    listOfTopicObjects[topicString] = myTopic;
    $("#help", that.contentDiv).remove();
  }
  
  
  /** @summary Callback for dropped objects */
  function handleDropTopicWidget(event, ui)
  { 
    var draggable = ui.draggable;
    addTopic(draggable.data('value'), true);
  }
  

  /**************** SUBOBJECTS ****************/
  /**
   * @classdesc Subscribes to a topic, flattens its structure and extracts numeric values
   * @param {string} cb_fields   - Callback function for the field names of the flattened message (called for first received message)
   * @param {string} cb_values   - Callback function for each value of a received message 
   */
  function flatTopic(topicString, cb_values, cb_fields)
  {
    /** @summary Callback for received messages */
    this.m_callback = function(msg) {
      curTopic.m_nreceived++;
      var msg_flat = that.flattenObject(msg, ["header"]);

      // First message: analyse structure, store numeric fields
      if (curTopic.m_nreceived == 1) {
        curTopic.m_flat = [];
        for (i in msg_flat)
          if ($.isNumeric(msg_flat[i])) {
            curTopic.m_flat.push(i);
            // Create sliders for all numeric fields
            if (curTopic.cb_fields)
              curTopic.cb_fields(curTopic.m_topicString, i);
          }
      }

      for (i in curTopic.m_flat)
        if (msg_flat.hasOwnProperty(curTopic.m_flat[i]))
          curTopic.cb_values(curTopic.m_topicString, curTopic.m_flat[i], msg_flat[curTopic.m_flat[i]])
    }

    var curTopic = this;
    this.m_topicString = topicString;
    /** Flattened strcuture; array of <level1>.<level2>.<i> */
    this.m_flat = 0;
    /** Counter of received messages. Message structure only initialized if m_nreceived > 0! */
    this.m_nreceived = 0;
    this.cb_fields = cb_fields;
    this.cb_values = cb_values;

    // Subscribe to message
    /** @todo Retry subscribe if rosbridge could not do it because of unknown type */
    this.m_topicObject = new ROSLIB.Topic({ros: that.myRosHandle, name: topicString, type: undefined,
      throttle_rate: that.throttle_ms});
    this.m_topicObject.subscribe(this.m_callback); 
  }

  /**
   * @classdesc Manages the DOM elements for the sliders and updates the GUI on message callbacks
   * @param properties  Should be a reference to contentObject.items. Slider configuration is saved there
   * @param template    Underscore template object for slider container
   */
  function SliderManager(properties, template)
  {
    /** @summary Creates a slider for a topic name and flattened field.
     *  Used as a callback for received topics and during load-from-storage.
     *  @param prop_idx (Optional) Index to m_properties to load slider properties from */
    this.createOne = function(topic_name, topic_field, prop_idx) {
      // Default properties for new objects
      var prop_def = { topic: topic_name, field: topic_field, min: Infinity, max: -Infinity, auto_range: true, symmetric_range: true, gui_range: true };
      if (prop_idx != undefined)
        // For loading, take values based on prop parameter, complete with defaults
        var prop = _.extend(prop_def, curObj.m_properties[prop_idx]); 
      else
        var prop = prop_def;

      // Compile template, create DOM objects
      var id = topic_name + "." + topic_field;
      var div = $(curObj.m_template({name: topic_field, min: "min", max: "max" }));
      var s = $("#slider", div).slider({value: 0, disabled: true, min: prop.min, max: prop.max, step: 0.0001});
      s.removeClass('ui-state-disabled');
      div.on("delete", curObj.deleteHandler);
      div.draggable({ helper: "clone",  appendTo: 'body' });
      div.appendTo(that.contentDiv);

      // Save created div, slider and properties
      curObj.m_divs.push(div);
      curObj.m_sliders.push(s);
      if (prop_idx != undefined) {
        curObj.m_properties[prop_idx] = prop;
        var obj_idx = prop_idx;
      } else 
        var obj_idx = curObj.m_properties.push(prop) - 1;
      // Mapping from id to index and from div to index
      curObj.m_ids[obj_idx] = id;
      div.data("id", id);
    }

    /** @summary Callback function for each received message and each flattened field therein */
    this.cbData = function(topic_name, topic_field, value) {
      var id = topic_name + "." + topic_field;
      var idx = curObj.m_ids.indexOf(id);
      if (idx == -1)
        return;
    
      // Find corrresponding div, slider and properties object
      var d = curObj.m_divs[idx];
      var s = curObj.m_sliders[idx];
      var p = curObj.m_properties[idx];

      // Range update
      if (p.check_range || (p.auto_range && p.min > value)) {
        p.min = value; p.gui_range = true;
      }
      if (p.check_range || (p.auto_range && p.max < value)) {
        p.max = value; p.gui_range = true;
      }
      if (p.symmetric_range && p.gui_range) {
        p.max = Math.max(Math.abs(p.min), Math.abs(p.max));
        p.min = -p.max;
      }

      // GUI updates
      s.slider("option", "value", value);
      $('#val', d).text(that.formatNumber(value, 4));
      // Flash background
      if (that.contentObject.options.flash_message)
        d.removeClass('flash').animate({'nothing':null}, 1, function () {
          $(this).addClass('flash'); });

      if (p.gui_range) {
        $('#min', d).text(that.formatNumber(p.min, 4));
        s.slider("option", "min", p.min);
        $('#max', d).text(that.formatNumber(p.max, 4));
        s.slider("option", "max", p.max);
        delete curObj.m_properties[idx].gui_range;
      }
    }

    /** @summary Creates all the sliders and also topic objects from the properties structure during loading */
    this.load = function()
    {
      for (i in this.m_properties) {
        var p = this.m_properties[i];
        this.createOne(p.topic, p.field, i);
        addTopic(p.topic);
      }
    }

    /** @summary Delete fires event "delete" for dropped slider items. DOM objects store id in data("id"). */
    this.deleteHandler = function(ev) {
      var id = $(ev.target).data("id");
      if (id != undefined) {
        var i = curObj.m_ids.indexOf(id);
        if (i > -1) {
          curObj.m_ids.splice(i,1);
          curObj.m_divs.splice(i,1);
          curObj.m_sliders.splice(i,1);
          curObj.m_properties.splice(i,1);
          $(ev.target).animate({opacity: "0.2", height: "3px" }, 500, "swing",
            function ()
            { $(ev.target).remove() });
        }
      }
      // @todo Remove flatTopic object if noone is using it any more
    }

    var curObj = this;
    /** Stores the slider DIV containers, DOM objects and properties (equal to saved state) */
    this.m_divs = [];
    this.m_sliders = [];
    this.m_properties = properties;
    /** List of ids (topic+field) */
    this.m_ids = [];
    this.m_template = template;
  }
  
}
