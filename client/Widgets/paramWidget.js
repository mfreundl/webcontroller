/**
 *  @file paramWidget.js contains the source code of the paramWidget
 *  @author Martin Freundl <martinfreundl@web.de>
 */

widgetList.push("paramWidget");

  /**
   *  Creates an instance of the paramWidget
   *  @extends widgetBase
   *  @constructor
   *  @param {Object} config - object with following keys:
   *   * type - the type of the widget (here paramWidget)
   *   * pos - the position of the screen where to display the widget
   *   * size - the height and width of the widget (if not set, default is 300x300)
   *   * content - the widget's contentObject that has been saved from a previous session (if not set, the widget is empty)
   */
  function paramWidgetObject(config)
  {
    widgetBase.apply(this, [config]);
    var that = this;
    
    this.title = "Parameters";
    this.description = "Get and set ROS parameters";
    this.use_viewmodes = 2;
    
    /**
     * called by main to trigger the creation of the param widget.
     * necessary variables are initialized and further processing of the div is done
     * @method
     */
    this.createWidget = function()
    {
      //contentDiv is inherited by widgetBase and represents the content container of the widget.
      //here it is made droppable to accept elements of the param section of the menu bar.
      that.contentDiv.droppable({
        accept:'#menuParam li',
        drop:handleDropParamWidget,
        hoverClass:'hovered'
      });
      
      //append the input dialog for creating new params on the top of the content-div 
      createParamCreationRow(); 
      

      /** the table which displays the dropped entries in the widget's view */
      that.paramTable = $('<table class="pTable"></table>').appendTo(that.contentDiv);
      
      /**
       * a list of the currently displayed params in the widget
       * @type {parameterObject[]}
       */  
      that.insertedElements = new Object();
      
      /**
       * a list of the names of the currently displayed params in the widget. this list is a property of the contentObject which is stored during a save process
       * @type {string[]}
       */  
      that.contentObject.items = new Array();
      
      //loading the widget's content of a previous session if there was one
      //loadMe(config.content);
    }

    
    function createParamCreationRow()
    {
      /** this is the top dialog of every paramWidget where you can create a new parameter */ 
      var row = $('<tr></tr>')
                .appendTo($("<table style='width:100%; table-layout:fixed; background:#cccccc;'></table>")
                .appendTo($("<div class='view0'></div>").appendTo(that.contentDiv)));
      
      /** this points to the input field of the name of the parameter you create your own */          
      var paramOwnName = $("<input title='paramName' type='text' placeholder='[paramName]'></input>")
                       .change(function(){$(this).css("background", $(this).val() == "" ? "red" : "green")})
                       .appendTo($("<td></td>").appendTo(row))
                       .tooltip();
                       
      var paramOwnValue = $("<input title='paramValue' type='text' placeholder='[paramValue]'></input>")
                   .change(function(){$(this).css("background", $(this).val() == "" ? "red" : "green")})
                   .appendTo($("<td></td>").appendTo(row))
                   .tooltip();
      
      //here we append the create button to the top row and connect it to an event handler       
      $("<button class='fa fa-plus-circle' title='Add parameter' />")
      .click(function(){
        if(paramOwnName == "" || paramOwnValue == "")
        {
          return;
        }
        else
        {
          handleSetButtonPress({"m_parameterString":"/"+paramOwnName.val(), "m_inputField":$('<input style="width:100%;" type="text" value="">').val(paramOwnValue.val())});
          insertItems("/"+paramOwnName.val(), true);
          console.log("test");
          that.mainPointer.refreshMenu(that.mainPointer.desktopHandle.data("ros"));
          
        }
        paramOwnName.val("").css("background", "white");
        paramOwnValue.val("").css("background", "white");
      })
      .appendTo($("<td></td>").appendTo(row));
    }

    
    /**
     * cleanMeUp() is called by the main application when removing the widget.
     * it was implemented to tidy up possible instances of objects to avoid memory leaks.
     * @method
     */
    this.cleanMeUp = function()
    {
      //write code to tidy things of this widget up before deleting its div
      console.log("done");
      that.myRosHandle.close();
      
      //the documentation of colresizable says to disable their functionality before removing the table from the DOM
      try {that.paramTable.colResizable({disable: true});} catch(e) {console.log(e);}
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
      //if(content)
      //{
        //$.each(content.items, function(key, value){
          //insertItems(value);
        //});
      //}
    //}
    
    //should analize the items in the list and create or delete html according to the items
    this.render = function()
    {
      if(that.contentObject)
      {
        $.each(that.contentObject.items, function(key, value){
          insertItems(value, false);
        });
      }
    }
    
    /**
     * this is the event handler of the drop event of the widget's view.
     * it finds out the name of the dropped parameter and triggers insertItems()
     * @param {Object} event - contains infos about the event
     * @param {Object} ui - the jQueryUI object that was dropped into the widget and which is needed to find out the parameters name.
     * @method
     */
    function handleDropParamWidget( event, ui )
    {
      var draggable = ui.draggable;
        if(that.insertedElements[draggable.data('value')])
        {
          return;
        }
        insertItems(draggable.data('value'), true);
    }
    
    /**
     * insertItems() takes the name of the parameter, creates an object of parameterObject and displays its view in the widget's view table.
     * furthermore the parameterObject gets stored in the list of items and the name of the parameter gets stored into the content object.
     * the call of parameterObject.m_createMe() in the last line creates the helper object's view and appends it to the widget's view table.
     * @param {string} paraString - the name of the parameter to display
     * @method
     */    
    function insertItems(paraString, updating)
    {
        $("#help", that.contentDiv).remove();
        var myParameter = new parameterObject(paraString);
        that.insertedElements[paraString] = myParameter;
        
        //console.log(insertedElements);
        myParameter.m_createMe();  //TODO: hier kommt render() ins spiel, model emitted event -> render() updated view
        
        try
        {
          that.paramTable.colResizable({disable :true});
        }
        catch(e)
        {
          console.log(e);
        }
        that.paramTable.colResizable({liveDrag :true,
                                  gripInnerHtml:"<div class='fa fa-chevron-down'></div>"});
                                  
        //when loading a session, we do not have to update the itemlist of contentObject, because no other item was added
        if(!updating)
        {
          return;
        }
        that.contentObject.items = [];
        for(prop in that.insertedElements)
        {
          that.contentObject.items.push(prop);
        }
    }
    

    
    

    /**
     * creates an instance of parameterObject - the helper object for every entry of the parameterWidget
     * @constructor
     * @classdesc this class represents the view of every parameter of the widget.
     * it stores important elements of the view like the input field that has to be accessed later on when manipulating a parameter for example.
     * @param {string} parameterString - the name of the parameter this object is created for
     */
    function parameterObject(parameterString)
    {
      /** stores the name of the parameter */
      this.m_parameterString = parameterString;
      /** stores the pointer to the input field of the view */
      this.m_inputField;
      //this.m_container = $("<tr></tr>").appendTo($('<table style="table-layout:fixed;width:100%;"></table>').appendTo(paramDiv));
      /** stores the pointer to the view of this parameterObject which is appended to the view table of the widget */
      this.m_container = $("<tr></tr>").appendTo(that.paramTable);
      /**
       * this method sets up the view of this parameterObject.
       * it gets the parameter's value by contacting the ROS system and connects the event handlers to the buttons.
       * @method
       */
      this.m_createMe = function()
      {
        var currentObj = this;
        
        $('<td>'+this.m_parameterString+'</td>').appendTo(this.m_container);
        
        this.m_inputField = $('<input type="text" value="">');
        that.getParamValueByString(that.myRosHandle, this.m_parameterString, function(result){
          currentObj.m_inputField[0].value = result;
        });
        this.m_inputField.appendTo($('<td></td>').appendTo(this.m_container));
        
        var dom_btn = $("<td></td>").appendTo(this.m_container);
        
        $("<button class='fa fa-check' title='set' />").click(function() {handleSetButtonPress(currentObj);}).appendTo(dom_btn)//.css('float', 'right');
        $("<button class='fa fa-times-circle' title='delete'>").click(function() {handleDeleteButtonPress(currentObj);}).appendTo(dom_btn)//.css('float', 'right');
        $("<button class='fa fa-eye-slash'  title='hide'>").click(function() {handleRemoveButtonPress(currentObj)}).appendTo(dom_btn)//.css('float', 'right');
      }
      
    }
    

    /**
     * the event handler of the remove button.
     * it removes the parameterObject from items list
     * then it removes the parameterObject's view from the widget's view table.
     * @param {parameterObject} paraObj - the desired parameterObject to remove.
     * @method
     */
    function handleRemoveButtonPress(paraObj)
    {
      paraObj.m_container.remove();  //TODO: aufgabe von render(), model emitted event -> render() updates view
      delete that.insertedElements[paraObj.m_parameterString];
      
        that.contentObject.items = [];
        for(prop in that.insertedElements)
        {
          that.contentObject.items.push(prop);
        }
      
      $.each(that.insertedElements, function(key, value){
        console.log(key);
      });
    }
    
    /**
     * the event handler of the set button.
     * calls a method of the shared method class to set the parameter on the ROS system to the value of the input field
     * @param {parameterObject} paraObj - the desired parameterObject to manipulate.
     * @method
     */
    function handleSetButtonPress(paraObj)
    {
      that.setParameter(that.myRosHandle, paraObj);  
    }
    
    /**
     * the event handler of the delete button.
     * calls a method of the shared method class to delete the parameter on the ROS system.
     * a callback is returned ater deleting which calls handleRemoveButtonPress() in order to remove the entry of this parameter in the widget's view table
     * @param {parameterObject} paraObj - the desired parameterObject to delete.
     * @method
     */
    function handleDeleteButtonPress(paraObj)
    {
      that.deleteParameter(that.myRosHandle, paraObj, function() {
        handleRemoveButtonPress(paraObj);
        that.mainPointer.refreshMenu(that.mainPointer.desktopHandle.data("ros"));
      });
    }
  }
