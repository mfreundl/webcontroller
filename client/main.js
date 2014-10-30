/**
*@file main.js contains the source code of the core application
*@author Martin Freundl <martinfreundl@web.de>
*/

/** creates an instance of the main application
*@constructor
*@classdesc this is the class of the main application which cares about displaying the
*elements of the ROS system (Topics, Nodes, Services and Parameters) and manages
*the widgets as well as the load and storage mechanisms.
*/
function main() {

  /** used for storing the displayed widget-objects
  *@type {widgetBase[]}
  */
  var that = this;
  
  /** global sharedMethods Object to get access to its methods from main
  *@type {sharedMethods}
  */
  var sM = new sharedMethods();
  
  that.interrupted = false;
  /** Help text is loaded by ajax from README.html which is generated offline from README.md */
  that.help_text = "";
  
  /**
  *Creates an instance of an object that represents an ROS element in the menubar
  *@constructor
  *@classdesc This class provides the helper objects which are used
  *during the process of forming the menu entries out of the strings received by
  *ROSLIBJS when requesting the available elements on the ROS system
  */  
  function menuNode() {
    /**@desc contains the name of the ROS element displayed as menu entry
    *@type {string}
    */
    this.name;
    /**
    *@desc will be settled with junior entries which have the current entry as parent
    *@type {menuNode[]}
    */
    this.childList = new Array();
    /** contains the full hierarchical string of the parent entry
    *@type {string}
    */
    this.parent;
    /** contains the full hierarchical string to the current entry
    *@type {string}
    */
    this.stringSoFar;
    /** determines if the current menu entry will be set draggable
    *@type {boolean}
    *@default
    */
    this.draggable = false;
  }

  

  /** start of program, registers some event handlers, appends the top level lists to the menu containers
  *@method
  */
  this.initialize = function()
  {
    //register some event handlers
  
    //needed for touch devices
    $(document).delegate('input', 'click', function(){$(this).focus();});
    $(document).delegate('button', 'click', function(){$(this).focus();});
    
    //event handler for notification box
    $(document).delegate($(document), 'notMsg', function(e){
                                                  //var color = (e.color ? e.color : "black"); 
                                                  var d = new Date(e.timeStamp)
                                                  var time = "["+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"] ";
                                                  //var span = $("<span></span>").css("color", color).html(time+e.msg+"\n");
                                                  //span.prependTo("#notBox");
                                                  $("#notBox").html(time+e.msg+"\n"+$("#notBox").html());
                                                });
  
    $('<ul id="menuNode"></ul>').appendTo('#nodeContainer');
    $('<ul id="menuTopic"></ul>').appendTo('#topicContainer');
    $('<ul id="menuService"></ul>').appendTo('#serviceContainer');
    $('<ul id="menuParam"></ul>').appendTo('#paramContainer');
    $('<ul id="menuWidget"></ul>').appendTo('#widgetContainer');
    
    listWidgets();
    
    createControlElements();
    
    createNotificationBox();

    handleDesktops("init");
    
    /** Load a JSON string from hash in URL */
    if (location.hash.substr(0,1) == '#') {
        var str = location.hash.substr(1);
        //wait a short time to let the menus be filled und configured before recreating them during the next load
        window.setTimeout(function(){loadFromStorage(undefined, str);}, 1000)
    }

    // Load documentation
    $.ajax("README.html", {dataType: "html", success: function (data) { that.help_text = data; } })
  }
  
  
  /** this method handles further desktops. it also cares that only the widgets on the current desktops will be saved.
  *desktophandles contain a div element which is made sensitive to entries of the widget section of the drop-down-menu.
  *the desktopCounter helps to distinguish between the desktops and their corresponding widgetArrays.
  *@param {string} action - the method will create a new desktop or switch between existing desktops or delete the current desktop according to the action string
  *@method
  */ 
  function handleDesktops(action)
  {
    switch(action)
    {
      case "init":
        { 
          desktopCounter = 0;
          that.desktopList = [];
          that.widgetArr = [];
          that.widgetArr[desktopCounter] = [];
          that.desktopList[desktopCounter] = that.desktopHandle = $("<div class='desktopContainer'></div>").appendTo($("#siteContent"))
                                                                                                            .droppable({
                                                                                                               accept:'#menuWidget li',
                                                                                                               drop:handleDropEvent,
                                                                                                               hoverClass:'hovered'
                                                                                                            });
          connectToRos();
          
        }
        break;
      case "next":
        {
          if(that.desktopList.length == desktopCounter + 1)
          {
            $(document).trigger({type:'notMsg', msg:'new desktop created.'});
            that.desktopList[desktopCounter].hide();
            that.desktopHandle.data("name",that.desktop.val());
            that.desktop.val("");
            ++desktopCounter;
            that.widgetArr[desktopCounter] = [];
            that.desktopList[desktopCounter] = that.desktopHandle = $("<div class='desktopContainer'></div>").appendTo($("#siteContent"))
                                                                                                              .droppable({
                                                                                                                 accept:'#menuWidget li',
                                                                                                                 drop:handleDropEvent,
                                                                                                                 hoverClass:'hovered'
                                                                                                              });
            connectToRos(); 
          }
          else
          {
            that.desktopHandle.data("name",that.desktop.val())
            ++desktopCounter;
            that.desktopHandle.hide()
            that.desktopHandle = that.desktopList[desktopCounter];
            that.desktopList[desktopCounter].show();
            that.desktop.val(that.desktopHandle.data("name"));
            that.desktopHandle.appendTo($("body"));
            that.refreshMenu(that.desktopHandle.data("ros"));
            that.connectionMenuInput.val(that.desktopHandle.data("ip"));
            localStorage.lastIP = that.desktopHandle.data("ip");
            $(document).trigger({type:'notMsg', msg:'switched to next desktop "'+that.desktop.val()+'".'});
          } 
          
        }
        break;
      case "prev":
        {
          if(desktopCounter == 0)
          {
            $(document).trigger({type:'notMsg', msg:'that is already the first desktop.'});
            return;
          }
          that.desktopHandle.data("name",that.desktop.val())
          --desktopCounter;
          that.desktopHandle.hide();
          that.desktopHandle = that.desktopList[desktopCounter];
          that.desktopList[desktopCounter].show();
          that.desktop.val(that.desktopHandle.data("name"));
          that.desktopHandle.appendTo($("body"));
          that.refreshMenu(that.desktopHandle.data("ros"));
          that.connectionMenuInput.val(that.desktopHandle.data("ip"));
          localStorage.lastIP = that.desktopHandle.data("ip");
          $(document).trigger({type:'notMsg', msg:'switched to previous desktop "'+that.desktop.val()+'".'});
        }
        break;
      case "delete":
        {
          if(that.desktopList.length < 2)
          {
            $(document).trigger({type:'notMsg', msg:'last remaining desktop can not be deleted.'});
            return;
          }
          $(document).trigger({type:'notMsg', msg:'desktop "'+that.desktop.val()+'" deleted.'});
          
          //delete all the widgets of the desktop and also all their ros handles
          $.each(that.widgetArr[desktopCounter], function(key, widget){
            if(widget !== undefined)  //warum erste bedingung?
            {
              widget.cleanMeUp();
              widget.myDiv.remove();
            }
          });
          
          //delete the ros handle of the desktop
          that.desktopList[desktopCounter].data("ros").close();
          
          
          delete that.desktopList[desktopCounter];
          var tempList = [];
          var count = 0;
          $.each(that.desktopList, function(key, value){
            if(value !== undefined)
            {
              tempList[count] = value;
              ++count;
            }
            else
            {
              desktopCounter = (key == 0 ? 0: (key - 1)); 
            }
          });
          that.desktopList = tempList;
          that.desktopHandle.remove();
          that.desktopHandle = that.desktopList[desktopCounter];
          that.desktopList[desktopCounter].show();
          that.desktop.val(that.desktopHandle.data("name"));
          that.desktopHandle.appendTo($("body"));
          that.refreshMenu(that.desktopHandle.data("ros"));
          that.connectionMenuInput.val(that.desktopHandle.data("ip"));
        }
        break;
      default:
        //nothing to do
        break;
    }
  }
  
  
  /** this method establishes a connection to the remote system. first it makes sure that an active roshandle is closed before a new one is created. the order of ip addresses which are tried to connect to is: 1. ip given as argument, 2. ip contained in the input box of the connect menu, 3. ip contained in the local storage... after trying to connect two events could happen which will be handled by the two event handlers.
   *@param {string} ip - ip address to connect to, if not given other possibilities are tried  
   *@method
   */
  function connectToRos(ip)
  {
    try
    {
      that.desktopHandle.data("ros").close();
    }
    catch(e)
    {
      console.log(e);
    }
    ip = (ip !== undefined ? ip : (that.connectionMenuInput.val() != "" ? that.connectionMenuInput.val() : localStorage.lastIP));
    that.connectionMenuInput.val(ip);
    var ros = new ROSLIB.Ros();
    ros.onAny(function(event){if(event.type == "error"){handleErrorEvent(ip);}else if(event.type == "open"){handleConnectEvent(ip);}});
    ros.connect("ws://"+ip);
    
      /** if connecting results in an error event, this method is called telling that there is a connection problem
      *@method
      */
      function handleErrorEvent(ip)
      {
        that.connectionMenuBtn.css("color", "red");
        $("div", that.connectionMenuBtn).removeClass("fa-spin");
        delete localStorage.lastIP;
        $(document).trigger({type:'notMsg', msg:"ip is wrong or rosbridge not running on target system."});
      }
      
      /** if connecting results in an open event, this method is called and continues with setting important variables and calling refreshMenu()
      *@method
      */
      function handleConnectEvent(ip)
      {
        
        that.desktopHandle.data("ros", ros);
        that.desktopHandle.data("ip", ip);
        localStorage.lastIP = ip;
        that.refreshMenu(ros);
        $(document).trigger({type:'notMsg', msg:"connected to '"+ip+"'."});
      }
  }
  
  function testConnection(cb_result)
  {
      //TODO: untersuchen ob dieser fall überhaupt noch eintreten kann
      if(!that.desktopHandle.data("ros"))
      {
        $(document).trigger({type:'notMsg', msg:"no ros handle for '"+that.desktopHandle.data('ip')+"' obtained."});
        window.clearInterval(that.interval);
        return;
      }
      testService  = new ROSLIB.Service({
      ros : that.desktopHandle.data("ros"),
      name : '/rosapi/get_time',
      serviceType : '/rosapi/GetTime'
    });
    
    var req = new ROSLIB.ServiceRequest({
    });
    
    testService.callService(req, function(result) {
      cb_result(result);
    });
  }
  
  function connectionBroken()
  {
    that.interrupted = true;
    $(document).trigger({type:'notMsg', msg:"connection to '"+that.desktopHandle.data('ip')+"' broken."});
    that.connectionMenuBtn.css("color", "red");
    $("div", that.connectionMenuBtn).removeClass("fa-spin");
    //that.connectionMenuBtn.attr("disabled", "disabled");
    window.clearInterval(that.interval);
  }
  

  /**this method destroys the menu, requests the current available ROS elements on the system, implements the nested and chained structure and transforms them back to the jQueryUI menu.
  *it also handles the timers which make use of method testConnection to identify a broken connection an call the appropriate method.
  *@param {ROSLIB.Ros} ros - the ros handle
  *@method
  */  
  this.refreshMenu = function(ros)
  {
     
     if(!ros)
     {
       return;
     }
     
      try
      {
        window.clearTimeout(that.countDown);
        window.clearInterval(that.interval);
      }
      catch(exception)
      {
        console.log(exception);
      }
      that.countDown = window.setTimeout(function(){connectionBroken();}, 2000);  
      that.interval = window.setInterval(function(){testConnection(
        function(result){
          if(that.interrupted)
          {
            connectToRos();
          }
          that.interrupted = false;
          try{window.clearTimeout(that.countDown);}
          catch(exception){console.log(exception);};
          that.connectionMenuBtn.css("color", "green");
          $("div", that.connectionMenuBtn).removeClass("fa-spin");
          that.countDown = window.setTimeout(function(){connectionBroken();}, 2000);});},
      1000);
    that.connectionMenuBtn.css("color", "black");
    $("div", that.connectionMenuBtn).addClass("fa-spin");
    try
    {
      $('#menuNode').menu("destroy");
      $('#menuNode').empty();
      $('#menuTopic').menu("destroy");
      $('#menuTopic').empty();
      $('#menuService').menu("destroy");
      $('#menuService').empty();
      $('#menuParam').menu("destroy");
      $('#menuParam').empty();
    }
    catch(exception)
    {
      console.log(exception)
    }
        
      ros.getTopics(function(topics){
        listTopics(topics);
        ros.getServices(function(services){
          listServices(services);
          ros.getParams(function(params){
            listParams(params);
            getNodes(ros, function(nodes){
              listNodes(nodes);
              makeMenu();
              //window.setTimeout(function() {makeMenu();}, 3000);
            });
          });
        });
      });
  }

  function createNotificationBox()
  {
    var notBoxContainer = $("<div</div>").addClass("notificationBox").appendTo("#siteContent");
    $("<div>NotificationBox</div>").appendTo(notBoxContainer).addClass("notBoxHead").click(function(){
                                                                                                if(notBoxContainer.css("height") == "20px")
                                                                                                {
                                                                                                  notBoxContainer.animate({height:"200px"});
                                                                                                  textBox.toggle();
                                                                                                }
                                                                                                else
                                                                                                {
                                                                                                  notBoxContainer.animate({height:"20px"});
                                                                                                  textBox.toggle();
                                                                                                }
                                                                                              });
    var textBox = $("<textarea id='notBox' readonly></textarea>").appendTo(notBoxContainer);
  }


   /** this method makes menu entries that belong to the '.i_am_draggable' class draggable and transforms the columns into a jQueryUI menu.
   *@method
   */ 
   function makeMenu()
   { 

     $( ".i_am_draggable" ).draggable({
            helper: function() {return $(this).clone().zIndex(10).css('width', this.offsetWidth)[0];},
            cursor:'move',
            revert:true
            //snap:'#drop'
            //drag:handleDragEvent
          });
     $( ".i_am_draggable a" ).css('font-weight', 'bold');
     $( "#menuNode li").data("type", "Node");
     $( "#menuTopic li").data("type", "Topic");
     $( "#menuService li").data("type", "Service");
     $( "#menuParam li").data("type", "Param");
     $( "#menuNode" ).menu();
     $( "#menuTopic" ).menu();
     $( "#menuService" ).menu();
     $( "#menuParam" ).menu();
   }




  /** this method creates the necessary elements such as buttons or input boxes to control the application
  *@param {string} currentDesktop - the name of the desktop
  *@param {string} connectionMenuInputVal - the address the client is connected to
  *@method
  */ 
  function createControlElements(currentDesktop, connectionMenuInputVal)
  {

    var ctrlBoxTemplate = _.template('<div>' +
                                      '<div id="connectionMenu" style="float:left;">' +
                                        '<button id="connectionMenuBtn" title="click to refresh menu, green means connected, red not"><div class="fa fa-refresh"></div></button>' +
                                        '<div id="connectionMenuContent"><a href="#"><input id="connectionMenuInput" value="<%= address %>" placeholder="ip:port" type="text"><button class="fa fa-check" title="change"></button></a></div>' +
                                      '</div>' +
                                      '<input id="desktop" style="float:left;" value="<%= desktopName %>" title="Desktop name; must consist of the following characters: a-z, A-Z, 0-9 and _" type="text" placeholder="[Desktopname]">' +
                                      '<button id="saveBtn" class="fa fa-save" style="float:left;" title="Save current configuration under the current desktop name"></button>' +
                                      '<div id="loadMenu" style="float:left;"><button class="fa fa-folder-open" title="Load"></button><ul id="loadMenuContent" style="position:absolute;"></ul></div>' +
                                      '<button id="prevBtn" class="fa fa-arrow-left" style="float:left;" title="previous desktop"></button>' +
                                      '<button id="nextBtn" class="fa fa-arrow-right" style="float:left;" title="next/new desktop"></button>' +
                                      '<button id="trashBtn" class="fa fa-trash-o" title="drag widgets/elements here to delete them, clicking deletes current desktop"></button>' +                          
                                    '</div>');
    
    var events = {"click #connectionMenuBtn": function(){if($("#connectionMenuBtn").css("color") == "rgb(255, 0, 0)"){$("#connectionMenuContent button").click();}else{that.refreshMenu(that.desktopList[desktopCounter].data("ros"));} createControlElements(that.desktop.val(), that.connectionMenuInput.val());},
                  "click #connectionMenuContent button": function(){connectToRos();},
                  "change #desktop": function(){var pattern = new RegExp("^([a-zA-Z0-9_])*$");if(that.desktop.val() != "" && pattern.test(that.desktop.val()) == false){alert("wrong chars in desktop name!");}},
                  "click #saveBtn": function(){saveToStorage();},
                  "click #prevBtn": function(){handleDesktops("prev");},
                  "click #nextBtn": function(){handleDesktops("next");},
                  "click #trashBtn": function(){handleDesktops("delete");}}
    
    //compile template, create controlBox
    $("#controlBox").undelegate().empty().append(ctrlBoxTemplate({address: (connectionMenuInputVal ? connectionMenuInputVal : ""), desktopName: (currentDesktop ? currentDesktop : "")}));
    //register Events
    sM.delegateEvents(events, $("#controlBox"));
    
    //export important control elements to mainApp
    that.connectionMenuBtn = $("#connectionMenuBtn");
    that.connectionMenuInput = $("#connectionMenuInput");
    that.desktop = $("#desktop");
    
    //make trash bin droppable
    $("#trashBtn").droppable({
                      drop:handleDropEventDelete,
                      accept:".widget, .im_a_save, .deleteableEntry",
                      tolerance:"touch",
                      hoverClass:'hovered' 
                  });
    
    //create list entries for server saves
    var menuContent = $("#loadMenuContent");
    $('<a href="#">Server Storage</a>').appendTo($('<li class="ui-state-disabled"></li>').appendTo(menuContent));
    var jqXHR = $.post('./cgi-bin/load.py', "json");//end cgi-call
    
    jqXHR.fail(function()
          {
            $(document).trigger({type: 'notMsg', msg: 'error while obtaining the save entries from the server'})
            
          })
         .done(function(data)
          {
                  var serverSaveObject = $.parseJSON(data);
                  
                  $.each(serverSaveObject, function(key, desktopObj){
                      if(desktopObj !== undefined) //warum?
                      {
                        var d = new Date(desktopObj.stamp);
                        $('<a href="#">'+desktopObj.desktop+' - '+d.toLocaleString()+'</a>').appendTo($('<li></li>').draggable({
                                                                                                          cursor:'move',
                                                                                                          revert:true
                                                                                                        })
                                                                                            .attr('class', 'im_a_save')
                                                                                            .data('object', desktopObj)
                                                                                            .data('server_or_client','server')
                                                                                            .click(function(){loadFromStorage(this)})
                                                                                            .appendTo(menuContent));
                      }
                  });
                
                //the following code is still in the callback section of the cgi-call to make sure that the server save entries are obtained before creating the menu()
                
                //create list entries for local saves
                $('<a href="#">Local Saves</a>').appendTo($('<li class="ui-state-disabled"></li>').appendTo(menuContent));
                if(localStorage.mySave !== undefined)
                {
                  //read localStorage to get available saves
                  var localSaveObject = eval("(" + localStorage.mySave + ")");
                  $.each(localSaveObject, function(key, desktopObj){
                    if(desktopObj !== undefined) //warum?
                    {
                      var d = new Date(desktopObj.stamp);
                      $('<a href="#">'+desktopObj.desktop+' - '+d.toLocaleString()+'</a>').appendTo($('<li></li>').draggable({
                                                                                                        cursor:'move',
                                                                                                        revert:true
                                                                                                      })
                                                                                          .attr('class', 'im_a_save')
                                                                                          .data('object', desktopObj)
                                                                                          .data('server_or_client','client')
                                                                                          .click(function(){loadFromStorage(this)})
                                                                                          .appendTo(menuContent));
                    }
                  });
              }
            menuContent.menu();
          });
  }


  /**takes the sorted and chained menuNode-objects and appends the entries to the right menu columns. the nested structure is implemented by creating different hierarchical levels of HTML lists. the list elements get an id attribute corresponding to their stringSoFar in order to let the children know where to append. the function is called recursivly until every chain of the inputted list reaches its end.   
  *@param {menuNodes[]} nodesOfSameLevel - this list contains the chained menu entries created during the processes of zerlegen() and sortMenuNodes()
  *@param {string} menuType - determines the right column of the menu for the list 
  *@method
  */
  function addToMenu(nodesOfSameLevel, menuType)
  {
    for(var i = 0; i < nodesOfSameLevel.length; ++i)
    {
      if(nodesOfSameLevel[i])
      {
        var ssfReplaced = nodesOfSameLevel[i].stringSoFar.replace(/\//g, "_");
        if(nodesOfSameLevel[i].parent !== undefined)
        {
          var pReplaced = nodesOfSameLevel[i].parent.replace(/\//g, "_");
          $('<li><a href="#">'+nodesOfSameLevel[i].name+'</a></li>').appendTo('#'+menuType+pReplaced).attr('id', menuType+ssfReplaced+'_').data('value', nodesOfSameLevel[i].stringSoFar);
          if(nodesOfSameLevel[i].childList[0] !== undefined)
          {
            $('<ul></ul>').attr('id', menuType+ssfReplaced).appendTo('#'+menuType+ssfReplaced+'_');
          }  
        }
        else
        {
          $('<li><a href="#">'+nodesOfSameLevel[i].name+'</a></li>').appendTo('#'+menuType).attr('id', menuType+ssfReplaced+'_').data('value', nodesOfSameLevel[i].stringSoFar);
          if(nodesOfSameLevel[i].childList[0] !== undefined)
          {
            $('<ul></ul>').attr('id', menuType+ssfReplaced).appendTo('#'+menuType+ssfReplaced+'_');
          }          
        }
        if(nodesOfSameLevel[i].draggable)
        {
          $('#'+menuType+ssfReplaced+'_').attr('class', 'i_am_draggable');
        }
        addToMenu(nodesOfSameLevel[i].childList, menuType);  //recursive call
      }
    }
  }   
  
  /** transforms the full hierarchical string of one ROS element into chained objects of type menuNode - where each menuNode represents one hierarchical level. The hierarchy is marked by slashes in the string. The function is called recursively by processing the original string from the left to the right. Every loop shrinks the string of one level and the loop stops when the whole string has been tranformed to menuNode objects. returns the chained root menuNode-object.
  *@param {string} string - the part of the string of an ROS element that has not yet implemented in chained menuNode objects
  *@param {string} parentName - the name of the parent menuNode
  *@type {menuNode}
  *@method
  */
  function zerlegen(string, parentName)
  {
    var result = string.indexOf('/', 1);
    var myNode = new menuNode();
    if(result == -1)
    {
      myNode.name = string;
      myNode.parent = parentName;
      myNode.stringSoFar = parentName !== undefined ? parentName + myNode.name : myNode.name;
      myNode.draggable = true;
      return myNode;
    }
    else
    {
      myNode.name = string.slice(0,result);
      myNode.parent = parentName;
      myNode.stringSoFar = parentName !== undefined ? parentName + myNode.name : myNode.name;
      myNode.childList.push(zerlegen(string.substr(result), myNode.parent !== undefined ? myNode.parent+myNode.name : myNode.name));  //recursive call
      myNode.draggable = false;
      return myNode;
    }
  }
  
  /** analyses the array of all the nested menuNodes in order to group up children that have the same parent. recursive method stops when reaching the last level of the last branch. returns the list of minimal root menuNode-objects that have a sorted chain now.
  *@param {menuNodes[]} nodesOfSameLevel - list of chained/nested menuNode-objects
  *@type {menuNode[]}
  */
  function sortMenuNodes(nodesOfSameLevel)
  {
    if(nodesOfSameLevel)
    {
      for (var i = 0; i < nodesOfSameLevel.length; ++i)
      {
        for(var a = i+1; a < nodesOfSameLevel.length; ++a)
        {
          if(nodesOfSameLevel[i] !== undefined && nodesOfSameLevel[a] !== undefined && nodesOfSameLevel[i].name ==  nodesOfSameLevel[a].name)
          {
            if(nodesOfSameLevel[i].draggable || nodesOfSameLevel[a].draggable)
            {
              nodesOfSameLevel[i].draggable = true;
            }
            nodesOfSameLevel[i].childList.push(nodesOfSameLevel[a].childList[0]);
            nodesOfSameLevel[a] = undefined;
          }
        }
      }
      
      var minimalNodesOfSameLevel = new Array()
      for(var i = 0; i < nodesOfSameLevel.length; ++i)
      {
        if(nodesOfSameLevel[i] !== undefined) 
        {
          minimalNodesOfSameLevel.push(nodesOfSameLevel[i]);
        }
      }
      
      for(var i = 0; i < minimalNodesOfSameLevel.length; ++i)
      {
        sortMenuNodes(minimalNodesOfSameLevel[i].childList)  //recursive call
      }
      
      return minimalNodesOfSameLevel;
      
    }
  }
    
  

  /** ROSLIBJS offers no built-in method to quickly get the list of available nodes on the ROS system. So this method will do the job by executing a special service of rosapi node on the ROS system
  *@param {main~cb_nodes} main~cb_nodes - the callback contains the list of available nodes as strings
  *@method
  */
  function getNodes(ros, cb_nodes)
  { 
    var srvNodes  = new ROSLIB.Service({
      ros : ros,
      name : '/rosapi/nodes',
      serviceType : '/rosapi/Nodes'
    });
    
    var request = new ROSLIB.ServiceRequest({
    });
   
   /**
   * the callback of getNodes()
   * @param {string[]} listOfNodes - the list of nodes
   * @callback main~cb_nodes
   */
    srvNodes.callService(request, function(result) {
    
      cb_nodes(result.nodes);
    });
  }
  
  
  
 /** this method lists the available widgets in the fifth column of the menu. 
 *the entries are made draggable and the column is transformed into a jQueryUI menu
 *@method
 */ 
 function listWidgets()
 {
     for (var i in widgetList) {
         w = widgetList[i];
         var name = w;
         //var name = eval(w+"()").name;
         $("<li><a>"+ name + "</a></li>").appendTo($("#menuWidget")).data("widgetType", w)
         console.debug("Widget:" + name);
     }
   
   $( "#menuWidget li" ).draggable({
          helper: function() {return $(this).clone().zIndex(10).css('width', this.offsetWidth)[0];},
          cursor:'move',
          revert:true
          //snap:'#drop'
          //drag:handleDragEvent
        });
   
   $("#menuWidget").menu();
 }
  







  
  /** this methods drives the whole process of transforming the list of node strings to a nested menubar.
  *@param {string[]} nodeList - array containing the full hierarchical strings of node elements
  *@method
  */
  function listNodes(nodeList){
    var listForNodeMenu = new Array();
    for(var i = 0; i < nodeList.length; i++)
    {
      listForNodeMenu.push(zerlegen(nodeList[i], undefined));
    }
    var sortedNodeList = sortMenuNodes(listForNodeMenu); 
    //checker(sortedNodeList);   
    addToMenu(sortedNodeList, "menuNode");
  }
  
  /** this methods drives the whole process of transforming the list of topic strings to a nested menubar.
  *@param {string[]} topicList - array containing the full hierarchical strings of topic elements
  *@method
  */
  function listTopics(topicList){
    var listForTopicMenu = new Array();
    for(var i = 0; i < topicList.length; i++)
    {
      listForTopicMenu.push(zerlegen(topicList[i], undefined));
    }
    var sortedTopicList = sortMenuNodes(listForTopicMenu);
    //checker(sortedTopicList);
    addToMenu(sortedTopicList, "menuTopic");
  }
  
  /** this methods drives the whole process of transforming the list of service strings to a nested menubar.
  *@param {string[]} serviceList - array containing the full hierarchical strings of service elements
  *@method
  */
  function listServices(serviceList){
    var listForServiceMenu = new Array();
    for(var i = 0; i < serviceList.length; i++)
    {
      listForServiceMenu.push(zerlegen(serviceList[i], undefined));
    }
    var sortedServiceList = sortMenuNodes(listForServiceMenu)
    //checker(sortedServiceList);
    addToMenu(sortedServiceList, "menuService");
  }
  
    /** this methods drives the whole process of transforming the list of param strings to a nested menubar.
  *@param {string[]} paramList - array containing the full hierarchical strings of param elements
  *@method
  */
  function listParams(paramList){
    var listForParamMenu = new Array();
    for(var i = 0; i < paramList.length; i++)
    {
      listForParamMenu.push(zerlegen(paramList[i], undefined));
    }
    var sortedParamList = sortMenuNodes(listForParamMenu)
    //checker(sortedParamList);
    addToMenu(sortedParamList, "menuParam");
  }


  /** this function is called when a widget or menu entry of the load section is dropped on the trash bin. it triggers the deletion process of a either an entry of the load section or of the widget.
  *@param {event} event - contains infos about the event
  *@param {jQueryUI} ui - contains the dropped jQueryUI object and some additional infos
  *@method
  */  
  function handleDropEventDelete( event, ui )
  {
    if(ui.draggable.hasClass("widget"))
    {
      deleteWidget( event, ui );
    }
    else if(ui.draggable.hasClass("im_a_save"))
    {
      deleteSaveEntry( event, ui);
    } else {
      // Call the delete handler for this object
      $(ui.draggable.context).trigger("delete");
    }
  }


  /** this function is called whenever a save entry gets dropped onto the trash bin. it will remove the save entry from the load entry list and the localStorage/serverStorage.
  *@param {event} event - contains infos about the event
  *@param {jQueryUI} ui - contains the dropped jQueryUI object and some additional infos
  *@method
  */  
  function deleteSaveEntry( event, ui )
  {
    //first of all we get the desktopObject which is associated to its draggable entry...
    var entry = ui.draggable.data('object');

    //this switch case statement decides weather the entry has to be deleted from the localStorage or the server
    switch(ui.draggable.data('server_or_client'))
    {
      case 'server':
      {
        var jqXHR = $.post('./cgi-bin/load.py', "json");
        
        jqXHR.fail(function(){$(document).trigger({type:'notMsg', msg:'error when requesting the server-save-files.'});})
             .done(function(data)
                  {
                      serverSaveObject = $.parseJSON(data);
                      $.each(serverSaveObject, function(key, desktopObj){
                        if(desktopObj !== undefined) //warum?
                        {
                          if(desktopObj.stamp == entry.stamp && desktopObj.desktop == entry.desktop)
                          {
                            delete serverSaveObject[key];
                          }
                        }
                      });
                      var jqXHR = jQuery.post("./cgi-bin/save.py", {json:JSON.stringify(serverSaveObject)});
                  
                      jqXHR.done(function() {
                        //alert( "second success" );
                        $(document).trigger({type:'notMsg', msg:'deleted from server'});
                      })
                        .fail(function() {
                        $(document).trigger({type:'notMsg', msg:'error when deleting entry from server.'});
                        console.log(jqXHR);
                      })
                        .always(function() {
                        //alert( "finished" );
                      });
                      
                      $(ui.draggable[0]).remove();   
                  });
        break;
      }
      case 'client':
      {
        var localSaveObject = eval("(" + localStorage.mySave + ")");  
        $.each(localSaveObject, function(key, desktopObj){
          if(desktopObj !== undefined) //warum?
          {
            if(desktopObj.stamp == entry.stamp && desktopObj.desktop == entry.desktop)
            {
              delete localSaveObject[key];
            }
          }
        });

        localStorage.mySave = JSON.stringify(localSaveObject);
        $(ui.draggable[0]).remove();
        break;
      }
      default:
        //nothing to do...
        break;
    }
  }


  /** this function is called whenever a widget gets dropped onto the trash bin. it will remove the widget from the widgetArr array of the current desktop, call the widgets cleanMeUp() method and remove the container of the widget from the DOM of the website.
  *@param {event} event - contains infos about the event
  *@param {jQueryUI} ui - contains the dropped jQueryUI object and some additional infos
  *@method
  */  
  function deleteWidget( event, ui )
  {
    $.each(that.widgetArr[desktopCounter], function(key, widget){
      if(widget !== undefined && widget.myDiv[0] == ui.draggable[0])  //warum erste bedingung?
      {
        widget.cleanMeUp();
        widget.myDiv.remove();
        delete that.widgetArr[desktopCounter][key];
      }
    });
  }



  /** this function is called when a menu entry of the widget section is dropped on the working desk. it triggers the loading process of a widget.
  *@param {event} event - contains infos about the event
  *@param {jQueryUI} ui - contains the dropped jQueryUI object and some additional infos
  *@method
  */  
  function handleDropEvent( event, ui )
  {
    loadWidget({"type":ui.draggable.data('widgetType'), "pos": {"top": ui.offset.top - 67, "left": ui.offset.left}});
  }
  
  /** creates a string in order to instantiate a specific widget and manage inheritance by setting up its prototype chain. the type of the widget is contained in the config object. depending on the type the created strings are different and they have to be executed by the eval() method as they can not be hard coded. the widget object will get appended to the widgetArr array of the current desktop. 
  *@param {Object} config - contains required infos like type and geometry
  *@method
  */
  function loadWidget(config)
  {
          
    eval("(handleInheritance(widgetBase, "+config.type+"Object))");
  
    function handleInheritance(parent, child)
    {
      var helper = function(){}
      helper.prototype = parent.prototype;
      
      child.prototype = new helper();
      child.prototype.constructor = child;
    }
  
    config.mainPointer = that;

    var obj = eval("(new "+config.type+"Object(config))");
    obj.createBase();
    obj.createWidget();
    obj.loadMe();
    
    that.widgetArr[desktopCounter].push(obj);
  }
 
  /** loads the exported saves from the dataObject which has been appended to every entry of the load menu during initialization. cleaning up the desk before loading.
  *@method
  *@param {jQuery{}} listEntry - the list entry as jQueryObject to obtain the dataObject to load
  */
  function loadFromStorage(listEntry, JSONString)
  {
    if(listEntry)
    {
      var desktopObj = $(listEntry).data('object');
    }
    else
    {
      var desktopObj = $.parseJSON(JSONString);
    }
    
    localStorage.lastIP = desktopObj.ip;
    connectToRos(desktopObj.ip);

    $.each(that.widgetArr[desktopCounter], function(key, widget){  //clean up the dash
      if(widget !== undefined)  //why?
      {
        widget.cleanMeUp();
        widget.myDiv.remove();
        delete that.widgetArr[desktopCounter][key];
      }
    });
    that.widgetArr[desktopCounter] = [];
    
    that.desktop.val(desktopObj.desktop);
    $.each(desktopObj.storageObject, function(key, config){     //load the stored widgets of the string
      loadWidget(config);
    });
  }
  
  /** saves the current state of the application to the local storage. Every displayed widget will be polled to receive its specific storage object. The storage objects will be grouped into one big object which belongs to the current desktop. This object is serialized to an JSON string that will be stored to the local storage and server storage.
  *@method
  */
  function saveToStorage()
  {
  
    //determine the number of saves which are stored in the localStorage
    var LocalStorageObject = {};
    var numberOfLocalSaves = 0;  
    if(localStorage.mySave !== undefined)
    {
      LocalStorageObject = eval("(" + localStorage.mySave + ")");  
      $.each(LocalStorageObject, function(key, desktopObj){
        if(desktopObj !== undefined) //warum?
        {
          ++numberOfLocalSaves;
        }
      });
    }
    else
    {
      numberOfLocalSaves = 0;
    }
    
    
    //determine the number of saves which are stored on the server
    var ServerStorageObject = {};
    var numberOfServerSaves = 0;
    var jqXHR_load = $.get('./cgi-bin/load.py', "json");
    jqXHR_load.fail(function(){$(document).trigger({type:'notMsg', msg:'error when requesting the server-save-files.'});})
         .done(function(data){
                try
                {   
                  ServerStorageObject = $.parseJSON(data);
                  $.each(ServerStorageObject, function(key, desktopObj){
                    if(desktopObj !== undefined) //warum?
                    {
                      ++numberOfServerSaves;
                    }
                  });
                }
                catch (e)
                {
                  console.log(e);//TODO: Error report
                }
              
              //the following is still in the callback section of the cgi-call to make sure the server object is loaded and analyzed...
              
              //update the local and server storage objects
              var time = new Date();
              if(that.desktop.val() === '')
              {
                alert("Enter a desktop name and press save to store a configuration. The stored configurations will appear by pressing the load button. The entries can be removed by dragging them onto the trash bin.")
                return;
              }

              var desktopObj = {stamp:time.getTime(),
                                desktop:that.desktop.val(),
                                ip:that.desktopHandle.data("ip")};

              var index = 0;
              var storageObject = new Object();
              $.each(that.widgetArr[desktopCounter], function(key, widget){
                if(widget !== undefined) //warum?
                {
                  storageObject[index] = widget.saveMe();
                  ++index;
                }
      });

      desktopObj.storageObject = storageObject;

      LocalStorageObject[numberOfLocalSaves] = desktopObj;
      ServerStorageObject[numberOfServerSaves] = desktopObj;
      console.log(JSON.stringify(desktopObj)); // For copying from console

      localStorage.mySave = JSON.stringify(LocalStorageObject);
      
      var jqXHR_save = jQuery.post("./cgi-bin/save.py", {json:JSON.stringify(ServerStorageObject)});
      
      jqXHR_save.done(function() {
        $(document).trigger({type:'notMsg', msg:'saved.'});
      })
        .fail(function() {
        $(document).trigger({type:'notMsg', msg:'error when saving.'});
        console.log(jqXHR);
      })
        .always(function() {
      });

      createControlElements(that.desktop.val(), that.desktopHandle.data("ip"));
    });//end cgi-call  
  }
}
