/**
 *  @file topicWidget.js contains the source code of the plotWidget
 *  @author Martin Freundl <martinfreundl@web.de>
 */

widgetList.push("plotWidget");

  /**
   *  Creates an instance of the plotWidget
   *  @extends widgetBase
   *  @constructor
   *  @param {Object} config - object with following keys:
   *   * type - the type of the widget
   *   * pos - the position of the screen where to display the widget
   *   * size - the height and width of the widget (if not set, default is 300x300)
   *   * content - the widget's contentObject that has been saved from a previous session (if not set, the widget is empty)
   */
function plotWidgetObject(config)
{
  widgetBase.apply(this, [config]);
  var that = this;

  this.title = "Topics";
  this.description = "Plot ROS Topics";

  /**
   * called by main to trigger the creation of the plot widget.
   * necessary variables are initialized and further processing of the div is done
   * @method
   */
  this.createWidget = function()
  {
    that.myDiv.droppable({
      accept:'#menuTopic li',
      drop:handleDropPlotWidget,
      hoverClass:'hovered'
    });
  
    /** the container for the plotting library flot */
    that.flotDiv = $('<div style="width:70%;float:left;height:100%"></div>').appendTo(that.contentDiv);
    /** the container for the check boxes to activate or deactivate certain fields of a topic) */
    that.choicesDiv = $('<div style="width:30%;float:left;"></div>').appendTo(that.contentDiv);
    /** the pointer for the rosTopicInstance */
    that.rostopicObject;
    /** the pointer to the instance of flot - the plotting library */
    that.plot = $.plot(that.flotDiv, [[[0,0]]]);
    
    that.myObject = [];
    that.dataSet = [];
    that.idle = false;

    that.start = new Date().getTime();
    
    //a reference of the plots option object is given to the widget's contentObject in order to be able to save the options
    that.contentObject.options = that.plot.getOptions();
    //hiding the plot's legend by default
    that.contentObject.options.legend.show = false;
    //changing this property between 0 and 1 adjusts the update rate and has an effect on the performance
    that.contentObject.updateRate = 0.2;
    
    that.contentObject.checked = [];
    
    //loading the save of a previous session if there exists one
    //loadMe(config.content); 
  }
  
  
  /**
   * loadMe() is called by the widget's constructor
   * if there is handed over a valid content object, the widget will restore its information.
   * otherwise the method does nothing.
   * @param {Object} content - the widget's contentObject that has been saved from a previous session (if not set, the method does nothing and the widget stays empty)
   * @method
   */  
  //function loadMe(content)
  //{

  //}
  
  that.render = function()
  {

    if(that.contentObject.topicString)
    {
      insertItem(that.contentObject.topicString);
    }
    if(that.contentObject.options)
    {
      //the following lines of code make sure that the contentObject.options points to the options Object of the plot...
      //changing plot options now can be easily done by changing the contentObject.option's attributes...
      //furthermore the options are automatically exported during save process...
      var temp = {};
      for(prop in that.contentObject.options)
      {
        temp[prop] = that.contentObject.options[prop];
      }
      console.log(temp);
      that.contentObject.options = that.plot.getOptions();
      for(prop in temp)
      {
        that.contentObject.options[prop] = temp[prop];
      }
    }
  }

  /**
   * cleanMeUp() is called by the main application when removing the widget.
   * it was implemented to tidy up possible instances of objects used by this widget to avoid memory leaks.
   * @method
   */
  this.cleanMeUp = function()
  {

    if(that.rostopicObject)
    {
      that.rostopicObject.unsubscribe();
      //write code to tidy things of this widget up before deleting its div
      console.log("done");
    }
    that.myRosHandle.close();
  }
  
  this.sleep = function()
  {
    console.log("sleep");
    that.idle = true;
  }
  
  this.wakeMeUp = function()
  {
    console.log("wakeMeUp")
    that.idle = false;
  }
  
  /**
   * this is the event handler of the drop event of the widget's view.
   * it finds out the name of the dropped topic and triggers insertItem()
   * @param {Object} event - contains infos about the event
   * @param {Object} ui - the jQueryUI object that was dropped into the widget and which is needed to find out the topic's name.
   * @method
   */
  function handleDropPlotWidget( event, ui )
  {
    if(that.contentObject.topicString != ui.draggable.data('value'))
    {
      insertItem(ui.draggable.data('value'));
      that.contentObject.checked = [];
    }
    
  }
  
  /**
   * this method is the core of the plotWidget.
   * it subscribes to the topic, buffers the values in arrays with the corresponding passed time since start and creates the view where you can activate or deactivate certain fields
   * of the topic in the plot
   * the arrays get shifted so that there are max 200 entrys of time value pairs stored per field - this results in a dynamic plot.
   * @param {string} topic - the name of the topic
   * @method
   */
  function insertItem(topic)
  {
    that.choicesDiv.empty();
    if(that.rostopicObject)
    {
      that.rostopicObject.unsubscribe();
    }
    
    that.start = new Date().getTime();
    that.myObject = [];
    that.dataSet = [];
  
    
    //getting additional information about the topic by contancting ROSLIBJS
    // TODO Recursive!
    that.getTopicTypeByTopicString(that.myRosHandle, topic, function(topicType){
      that.getMessageDetailsByTopicType(that.myRosHandle, topicType, function(messageDetails){
        
        //updating the contentObject so that the current topic name will get stored during the next save process
        that.contentObject.topicString = topic

        //connect the checkboxes with their event handler
        that.choicesDiv.find("input").click(handleCheckBoxClick);
      
	      
      
        //plot.getOptions().legend.show = false;
      
        //obtain an RosTopicInstance from ROSLIBJS in order to subscribe to the topic on the ROS system
        that.getRosTopicInstance(that.myRosHandle, topic, topicType, function(rostopicInstance){
          that.rostopicObject = rostopicInstance;
          
          //var myObject = [];
          
          
          createTreeView(that.myObject, that.choicesDiv, topicType);
          window.setTimeout(function(){subscribe(that.myObject, that.rostopicObject);}, 1000);  //TODO approach to callbacks
          window.setTimeout(function(){
                                    $.each(that.contentObject.checked, function(key,val){
                                      that.myObject[key].pointerToCheckbox[0].checked = val ? true : false;
                                      handleCheckBoxClick(that.myObject, that.dataSet);
                                    })
                                  }, 1000);
          //do subscribe


        });


        //execute the checkboxes' eventhandler from start in order to set up the data object which is passed to the plot
        //handleCheckBoxClick(myObject, dataSet);
        
        console.log(messageDetails);
        console.log("-----------------------");
        for(var i = 0; i < messageDetails.fieldnames.length; ++i)
        {
          console.log(messageDetails.fieldnames[i]+" ["+messageDetails.fieldtypes[i]+"]");
        }
        console.log("-----------------------");
      });
    });
  }
  
  function subscribe(myObject, rostopicObject)
  { 
    var counter = 1;
    rostopicObject.subscribe(function(message){
      if(counter < 1/that.contentObject.updateRate)
      {
        counter = counter + 1;
        return;
      }
      counter = 1;

      $.each(myObject, function(key, value){

        var val = eval("message"+value.locationString);
        var time = new Date().getTime() - that.start;
        if(value.isArray)
        {
          if(value.arrayLength == 0)
          {
            value.arrayLength = val.length;
            for(var z = 0; z < val.length; ++z)
            {
              var label = value.dataToPlot[0].label;
              value.dataToPlot[z] = {"label": label, "data": []};
            }
          }
          for(var z = 0; z < val.length; ++z)
          {
            value.dataToPlot[z].data.push([time, val[z]]);
            if(value.dataToPlot[z].data.length > 200)
            {
              value.dataToPlot[z].data.shift();
            }
          }
        }
        else
        {
          value.dataToPlot[0].data.push([time, val]);
          if(value.dataToPlot[0].data.length > 200)
          {
            value.dataToPlot[0].data.shift();
          }
        }
        
        


      });
      
      if(!that.idle)
      {
        draw();
      }
    
    });
  } 
  
  /**
   * this method cares about the displaying of the available fields of the topic in the plot
   * when a field is unchecked, its array will not be passed to flot - the plotting library.
   * furthermore the contentObject will be updated as soon as a check box is changed so that the change will be stored during the next save process
   * @method
   */

  function handleCheckBoxClick(myObject, dataSet)
  {
    for(var a = 0; a < dataSet.length; ++a)
    {
      dataSet[a] = {"label": "", "data": [0,0]};
    }
    var counter = 0;
    that.contentObject.checked = [];
    $.each(myObject, function(key, value){
      that.contentObject.checked.push(value.pointerToCheckbox[0].checked ? 1 : 0);
      if(value.pointerToCheckbox[0].checked)
      {
        if(value.isArray == true)
        {
          for(var z = 0; z < value.arrayLength; ++z)
          {
            dataSet[counter] = value.dataToPlot[z];
            counter = counter + 1;
          }
        }
        else
        {
          that.dataSet[counter] = value.dataToPlot[0];
          counter = counter + 1;
        }
      }
    });

    draw();

  }
  
  function draw()
  {
    that.plot.setData(that.dataSet);
    that.plot.setupGrid();
    that.plot.draw();
  }
  
  function createTreeView(topObj, parent, serviceType, locationString)
  {
    that.getMessageDetailsByTopicType(that.myRosHandle, serviceType, function(serviceRequestDetails){
      var locationStringArr = [];
      for(var i = 0; i < serviceRequestDetails.fieldnames.length; ++i)
      {
        locationStringArr[i] = (locationString ? locationString+"[\'"+serviceRequestDetails.fieldnames[i]+"\']" : "[\'"+serviceRequestDetails.fieldnames[i]+"\']");
        var isNotNumber = 1;
        if(serviceRequestDetails.fieldtypes[i] == "int16" || serviceRequestDetails.fieldtypes[i] == "int32" || serviceRequestDetails.fieldtypes[i] == "int64" || serviceRequestDetails.fieldtypes[i] == "uint16" || serviceRequestDetails.fieldtypes[i] == "uint32" || serviceRequestDetails.fieldtypes[i] == "uint64" || serviceRequestDetails.fieldtypes[i] == "float32" || serviceRequestDetails.fieldtypes[i] == "float64" || serviceRequestDetails.fieldtypes[i] == "int8" || serviceRequestDetails.fieldtypes[i] == "uint8")
        {
          isNotNumber = 0;
        }
        var lst = $("<li></li>").appendTo(parent);
        var inputField = $("<input style='width:20px;height:20px;' title='"+serviceRequestDetails.fieldtypes[i]+"' type='checkbox'>"+serviceRequestDetails.fieldnames[i]+"</input>").appendTo(lst).change(function(){handleCheckBoxClick(that.myObject, that.dataSet)})
        if(isNotNumber)
        {
          inputField.attr("disabled", "disabled");
        }
        if(that.fieldTypes[serviceRequestDetails.fieldtypes[i]] === undefined)  //fieldTypes ist undefined falls mesdtls.fieldtypes[i] nicht mit den einträgen in fieldTypes matcht
        {
          /**if(serviceRequestDetails.fieldarraylen[i] == 0)
          {
            console.log("muh");
            var a = $("<a></a>").appendTo(lst).click(function(){
                                                          for(var sibling = $($(this).context.nextSibling); ; sibling = $(sibling.context.nextSibling))
                                                          {
                                                            sibling.slideToggle();
                                                            if(!sibling.context.nextSibling)
                                                            {
                                                              break;
                                                            }
                                                           }
                                                         });
            a.html(serviceRequestDetails.fieldnames[i]+"[]   <- expand")
            a.attr("title", serviceRequestDetails.fieldtypes[i]);
            inputField.remove();
            var arr = new Array();
            var obj = {};
            arr.push(obj);
            topObj[serviceRequestDetails.fieldnames[i]] = arr;
            $("<span class='fa fa-plus-circle' style='font-size:10px;clear:both;float:right;'></span>").prependTo(lst)
            .data("details", serviceRequestDetails.fieldtypes[i])
            .data("array", arr)
            .data("lst", lst)
            .click(function(){
              var obj1 = {};
              var arr1 = $(this).data("array");
              arr1.push(obj1);
              if($($(this).data("lst")[0].children[$(this).data("lst")[0].childElementCount - 1]).css("display") == "block")
              {
                createTreeView(obj1, $("<ul></ul>").appendTo($(this).data("lst")), $(this).data("details"));
              }
              else
              {
                createTreeView(obj1, $("<ul></ul>").hide().appendTo($(this).data("lst")), $(this).data("details"));
              }
              
            });
            //obj.m_serviceType = serviceRequestDetails.fieldtypes[i]
            createTreeView(arr[0], $("<ul></ul>").appendTo(lst).slideToggle(), serviceRequestDetails.fieldtypes[i], locationStringArr[i]);
          }
          else
          {**/
            var a = $("<a></a>").appendTo(lst).click(function(){
                                                          for(var sibling = $($(this).context.nextSibling); ; sibling = $(sibling.context.nextSibling))
                                                          {
                                                            sibling.slideToggle();
                                                            if(!sibling.context.nextSibling)
                                                            {
                                                              break;
                                                            }
                                                           }
                                                         });
            a.html(serviceRequestDetails.fieldnames[i]+"   <- expand")
            a.attr("title", serviceRequestDetails.fieldtypes[i]);
            inputField.remove();
            var obj = {};
            createTreeView(topObj, $("<ul></ul>").appendTo(lst).slideToggle(), serviceRequestDetails.fieldtypes[i], locationStringArr[i]);
          }
        //}
        else
        {
          var dataToPlot = [];
          dataToPlot[0] = {"label": serviceType+"X"+serviceRequestDetails.fieldnames[i], "data": []};  
          topObj.push({"locationString": locationStringArr[i], "isArray": serviceRequestDetails.fieldarraylen[i] == 0 ? true:false, "arrayLength": 0, "pointerToCheckbox": inputField, "dataToPlot": dataToPlot})
        }
      }
    });
  }
  
  
  
  
}
