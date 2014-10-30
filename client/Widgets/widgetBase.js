/**
 *  @file widgetBase.js contains the source code of widgetBase - the parent class of all the widgets
 *  @author Martin Freundl <martinfreundl@web.de>
 */


/**
 * creates an instance of widgetBase - called within the constructor of every widget
 * @extends sharedMethods
 * @constructor
 * @classdesc widgetBase provides some general methods and members for all the widgets that
 * are needed for the widgets to get handled by the main application.
 * so almost all the necessary stuff to display, load and store a widget on the working desk is covered by widgetBase
 * @param {Object} config - object with following keys:
 *   * type - the type of the widget
 *   * pos - the position of the screen where to display the widget
 *   * size - the height and width of the widget (if not set, default is 300x300)
 *   * content - the widget's contentObject that has been saved from a previous session (not needed here, the junior widgets do process it themselfes)
 */

/** List of available widgets; appended when the widget source is inlcuded */
widgetList = [];

function widgetBase(config)
{
  var that = this;
  /** Pointer to MainClass */
  this.mainPointer = config.mainPointer;
  /** Title of Widget */
  this.title = "widgetBase";
  /** Short description/help text for widget */
  this.description = "Widget classes should overwrite title/description";
  /** For throttling; @todo should become an option */
  this.throttle_ms = 100;
  /** Events - define in backbone style */
  this.events = { "click #btn_settings": "handleSetButtonPress",
      "click #btn_viewmodes": "handleViewButtonPress",
      "mouseover #btn_viewmodes": function(a,b) { $("#btn_viewmodes").css('backgroundColor', 'red'); },
      "mouseout #btn_viewmodes": function(a,b) {
        $("#btn_viewmodes").css('backgroundColor', 'blue'); }
  };
  /** HTML template for widget, used with _.template */
  this.template = "<div class='widget <%= type %> view_top<%= viewmode %>' style='position: absolute;'>\
    <div id='title'><h2><%= title %></h2>\
    <div id='buttons'>\
      <button id='btn_settings' class='fa fa-gear' title='Settings' />\
      <% if (show_viewmodes) { %> <button id='btn_viewmodes' class='fa fa-eye' title='Toggle view modes' /><% } %>\
    </div>\
  </div>\
  <div id='content' style=''><div id='help' ><%= help %></div>\
  </div>";

  
  /** Configuration object which contains geometry information and maybe saved values from a recent session */
  //config object must be deep copied to the widgets so that the config objects which are bound to the load-list-entries are not modified when working with the widgets.
  //otherwise clicking the same load-list-entry after adding or deleting entries of a widget will not restore the state before changing it because the reference to the config object was changed.
  var clonedConfig = {};
  $.extend(true, clonedConfig, config);
  this.config = clonedConfig;
  if (!_.has(this.config, "options"))
    this.config.options = Object();
  // this.config.options = _.defaults(this.config.options, { throttle_ms: 100 });
   
  /**
   * if not overriden in the junior widgets, the main application will call this basic method of cleanMeUp on removing
   * which only results in closing the ROS handle.
   * if there is more to do on removing considering the junior widget, the method should be overriden in its class with the additional instructions.
   * do not forget to close the handle because when overriding the method, only the method of the junior class is executed.
   * @method
   */
  this.cleanMeUp = function()
  {
    console.log("cleanupBase");
    this.myRosHandle.close();
    //tidy up any objects that have been created
  }
  
  /**
   * sleep() is called when the when the widget is dragged, this function has to be overridden in the spezific widget class.
   * this function is intended to disable gui and save performance while dragging a widget.
   * @method
   */
  this.sleep = function()
  {
  }
  
  /**
   * this is the counterpart of the sleep() function
   * @method
   */
  this.wakeMeUp = function()
  {
  }
  
  /**
   * this method is called by main to trigger the creation of the widgetBase class.
   * here the root div of every widget is created and modified according to the right geometry and drag options.
   * furthermore the content and the heading div is appended to the root div.
   * @method
   */
  this.createBase = function()
  {
    /** @todo How to handle default values here / in widget*/
    if (that.viewmode == undefined)
      that.viewmode = 0;
    /** Default throttling for topics (in ms) @todo implement in widgets! */
    that.config.options.throttle = 100;
  
    /** the contentObject has been implemented to let the widgets append information to it which should be stored during the save process */
    this.contentObject = new Object();
    
    if(that.config.type)
    {
      this.type = that.config.type;
    }

    /** every widget has its own handle to the ROS system. the handle is activated here. */
    that.myRosHandle = that.getMyRosHandle(localStorage.lastIP);
  
    /**  Prepare GUI elements */
    var help = $('#'+this.type, that.mainPointer.help_text).parent().nextUntil(":header");
    help = $('<div/>').append(help).html();

    // Build the widget div
    this.myDiv = $(_.template(this.template, { title: this.title, type: this.type, help: help,
      viewmode: that.viewmode, show_viewmodes: this.use_viewmodes > 0 }));
    this.contentDiv = $('#content', this.myDiv);
    // Register events
    this.delegateEvents(this.events, this.myDiv);
    this.setupUI(that.myDiv);
    // Attach to DOM
    that.myDiv.appendTo(that.mainPointer.desktopHandle);
    
    
    // processing geometry information                                
    if(that.config.pos)
    {
      this.myDiv.css("top", that.config.pos.top).css("left", that.config.pos.left);
    }
    if(that.config.size)
    {
      this.myDiv.css("width", that.config.size.width).css("height", that.config.size.height);
    }
  }

  this.setupUI = function(div_obj)
  {
    div_obj.draggable({helper: "original",
                            distance: 10,
                            start: function()
                                    {
                                      $(this).addClass("dragWidgetClass");
                                      that.sleep();
                                      $.each($(this)[0].children, function(key, val)
                                        {
                                          $(val).hide();
                                        })
                                    },
                            stop: function()
                                    {
                                      $(this).removeClass("dragWidgetClass");
                                      that.wakeMeUp();
                                      $.each($(this)[0].children, function(key, val)
                                        {
                                          $(val).show();
                                        })
                                    }})
                  .resizable({start: function()
                                    {
                                      $(this).addClass("dragWidgetClass");
                                      that.sleep();
                                      $.each($(this)[0].children, function(key, val)
                                        {
                                          $(val).hide();
                                        })
                                    },
                            stop: function()
                                    {
                                      $(this).removeClass("dragWidgetClass");
                                      that.wakeMeUp();
                                      $.each($(this)[0].children, function(key, val)
                                        {
                                          $(val).show();
                                        })
                                    }});
  }
  
  /**
   * this method is triggered by main to create the specific widgets after the base was created.
   * this method has to be overwritten in the child widget classes.
   * @method
   */
  this.createWidget = function()
  {
    console.log("PARENT");
  }
  
  /**
   * this method is firstly called by loadMe() after the widgets have been created.
   * it looks at the item list of a widget and renders the entries if there are any.
   * this method has to be overwritten in the child widget class.
   * @method
   */
  this.render = function()
  {
  }
  
  /**
   * this method is called by main after the base and child widgets have been created.
   * this method makes the stored information/properties (if there is any) available to the widgets' contentObject
   * finally render() is called to let the widgets display their stored content...
   * @method
   */
  this.loadMe = function()
  {
    if(that.config.content)
    {
      that.contentObject = that.config.content;
    }
    
    that.render(); 
    
  }
  
  /**
   * saveMe() is called by the main application during the save process.
   * it packs the widget's geometry info, type and contentObject into a single storage object
   * that is returned to the main application.
   * @method
   */
  this.saveMe = function()
  {
    var widgetStorageObject = new Object();
    widgetStorageObject.content = this.contentObject;
    widgetStorageObject.pos = {"top":this.myDiv.css("top"),"left":this.myDiv.css("left")};
    widgetStorageObject.size = {"width":this.myDiv.css("width"),"height":this.myDiv.css("height")};
    widgetStorageObject.viewmode = this.viewmode;
    widgetStorageObject.type = this.type;
    return widgetStorageObject;
  }

  /**
   * the event handler of the set button in the top right of every widget.
   * it calls a shared method that will reflect all the properties of the widget's content object in an editable dialog.
   * @method
   */
  this.handleSetButtonPress = function ()
  {
    that.reflectMyPropertiesInDialogBox(that.contentObject, that.myDiv);
  }
  
  /** Toggle between viewmodes by adding class view_main1,... to myDiv. Child elements with class view<N> are only shown in view N by CSS rules. */
  this.handleViewButtonPress = function()
  {
      that.viewmode += 1;
      if (!that.use_viewmodes || that.viewmode >= that.use_viewmodes)
          that.viewmode = 0;
      that.myDiv.removeClass('view_top0').removeClass('view_top1').removeClass('view_top2');
      that.myDiv.addClass('view_top'+that.viewmode);
      console.debug("Viewmode: "+that.viewmode);
  }
}

//deriving from sharedMethods in order to make the methods available to every widget.
widgetBase.prototype = new sharedMethods();
widgetBase.prototype.constructor = widgetBase;
