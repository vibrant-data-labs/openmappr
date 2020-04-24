angular.module('common')
    .controller('NodeOverlayCtrl', ['$scope', '$rootScope', '$timeout', 'BROADCAST_MESSAGES', 'zoomService', 'nodeSelectionService', 'renderGraphfactory', 'dataGraph', 'graphSelectionService', 'partitionService', 'FilterPanelService', 'AttrInfoService', 'linkService',
        function($scope, $rootScope, $timeout, BROADCAST_MESSAGES, zoomService, nodeSelectionService, renderGraphfactory, dataGraph, graphSelectionService, partitionService, FilterPanelService, AttrInfoService, linkService) {
            'use strict';

            /*************************************
            ************ Local Data **************
            **************************************/
            var logPrefix = '[ctrlNodeOverlay: ] ';

            var snapData;
            var camPrefix = renderGraphfactory.getRenderer().options.prefix;
            var showNodeDetailOnLoad = false;
            var isGrid = false;
            //amount above center to start node overlay attr scroll container
            var scrollOffset = 160;
            var initOverlayNodeData = { //Used to transition node
                node: null,
                pos: {x: 0, y: 0}
            };

            $rootScope.Utils = {
                keys : function (obj){
                    var array = Object.keys(obj);
                    array.splice(array.indexOf('$$hashKey'),1)
                    return array;
                }
            }

            /*************************************
            ********* Scope Bindings *************
            **************************************/
                    /**
            *  Scope data
            */
            $scope.mockData = true;
            $scope.beginOverlayAnim = false;
            $scope.beginOverlayRightPanel= false;
            $scope.showOverlayFocusNode = false;
            $scope.showOverlay = false;
            $scope.hideContent = true;
            $scope.showNeighborLine = false;
            $scope.nodeAttrs = [];
            $scope.active = {
                tabs1: 'description',
                tabs2: 'keywords'
            }
            $scope.nodeRightInfo= {
                name: undefined,
                LastName: undefined,
                nameDescription: undefined,
                description: undefined,
                keywords: [],
                keyboards: [],
                video: undefined,
                publications:[],
                events:[],
                socialMedia:{
                    youtube: undefined,
                    linkedIn: undefined,
                },
                colorStr: undefined
            };

            if ($scope.mockData)
                $scope.nodeRightInfo= {
                    name: 'Diane Kelly',
                    LastName: 'Kelly',
                    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc erat urna, placerat ut tortor et, tincidunt gravida neque. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi mattis enim eu nisi dictum, nec porta',
                    youtube: 'https://www.youtube.com/embed/Fu1Zi1PYqos',
                    keywords: ['cars', 'industrial desing', 'trasportation', 'invertion', 'art'],
                    keyboards: ['test','test','test'],
                    video: '',
                    publications:[
                        {
                            published: 2015,
                            filmed: 2015,
                            duration: '18.2m',
                            comments: 52345
                        },
                        {
                            published: 2015,
                            filmed: 2015,
                            duration: '18.2m',
                            comments: 52345
                        }
                    ],
                    events:[
                        {
                            'Second Speker': 'Nicholas Negroponte',
                            'Speaker Occupation': 'Global Health Expert',
                            'Event': 'TED India',
                        }
                    ],
                    socialMedia:{
                        youtube: undefined,
                        linkedIn: undefined,
                    },
                    colorStr: undefined
                };


            /**
            * Scope methods
            */
            $scope.cancelOverlay = cancelOverlay;
            $scope.switchToNeighbor = switchToNeighbor; //neighbor switch stuff
            $scope.drawNeighborLine = drawNeighborLine; //neighbor line drawing
            $scope.finishAnimation = finishAnimation; //for when finished (show overlay)
            $scope.activeTabs = activeTabs;

            $scope.removeNeighborLine = function() {
                //kill line
                $scope.showNeighborLine = false;
            };


            $scope.attrRenderClicked = function() {
                $scope.cancelOverlay(true);
                FilterPanelService.rememberSelection(false);
            };

            //for when finished (show overlay)
            $scope.finishNeighborAnimation = function() {
                $scope.showFocusNode = false;
                $timeout(function() {
                    graphSelectionService.selectByIds(Array($scope.neighborNode.id));

                });
            };

            /*************************************
            ****** Event Listeners/Watches *******
            **************************************/
            $(window).on('resize', onWindowResize); //on resize, move node to correct position
            $scope.$on(BROADCAST_MESSAGES.selectNodes, onNodesSelect);
            $scope.$on(BROADCAST_MESSAGES.grid.clickNode, onClickNode); //if in grid
            $scope.$on(BROADCAST_MESSAGES.list.clickNode, onClickNode); //if in list

            $scope.$on(BROADCAST_MESSAGES.snapshot.loaded, function onSnapLoad(e, data) {
                snapData = data;
                if(snapData.snapshot) {
                    showNodeDetailOnLoad = snapData.snapshot.layout.settings.showNodeDetailOnLoad && $scope.mapprSettings.nodeFocusShow;
                }
            });
            $scope.$on(BROADCAST_MESSAGES.snapshot.changed, function onSnapChange(e, data) {
                $scope.cancelOverlay(true);
                snapData = data;
                if(snapData.snapshot) {
                    showNodeDetailOnLoad = snapData.snapshot.layout.settings.showNodeDetailOnLoad && $scope.mapprSettings.nodeFocusShow;
                }
            });

            $scope.$on(BROADCAST_MESSAGES.nodeOverlay.highlightText, function(e, data) {
                $scope.searchQuery = _.get(data, 'text', '');
            });

            $scope.$on(BROADCAST_MESSAGES.nodeOverlay.remove, function() {
                $scope.cancelOverlay();
            });

            $scope.$on(BROADCAST_MESSAGES.dataGraph.nodeAttrsUpdated, function() {
                _buildNodeAttrsList();
                if($scope.focusNode) {
                    _buildAttrsPrincipalVal();
                }
            });

            $scope.$on(BROADCAST_MESSAGES.layout.attrClicked, function(event, data) {
                var infoObj = AttrInfoService.getNodeAttrInfoForRG();
                var attr = data.attr;
                var ele = angular.element(document.getElementById('overlayattr-'+attr.id));
                if(ele.length === 1) {
                    $timeout(function() {
                        angular.element(document.getElementById('detailbox-scroll')).scrollToElementAnimated(ele, 200);
                    }, 500);
                }
            });

            /*************************************
            ********* Initialise *****************
            **************************************/

                    /*************************************
            ********* Core Functions *************
            **************************************/

            function onNodesSelect(e, data) {
                // TODO: correct this bug
                // if(!$scope.mapprSettings) return;
                // else if(($scope.mapprSettings.nodeFocusShow || showNodeDetailOnLoad === true)
                // TODO: restore validation
                if(!$scope.mapprSettings) return;
                else if($scope.mapprSettings.nodeFocusShow && data.newSelection
                        && $scope.nodeOverlayProps.enabled && $scope.layout.plotType !== 'grid') {
                    if(_.isArray(data.nodes) && data.nodes.length === 1) {
                        //reset so only shows on snapshot load
                        showNodeDetailOnLoad = false;
                        isGrid = false;
                        //may not need
                        $scope.focusNode = data.nodes[0];
                        if($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') $scope.beginOverlayRightPanel= true;
                        else $scope.beginOverlayAnim = true;

                        animateGraphToOverlay();
                    }
                    else if(_.isArray(data.nodes) && data.nodes.length > 1) {
                        $scope.cancelOverlay(true);
                    }
                }
            }

            function onClickNode(e, data) {
                if(($scope.mapprSettings.nodeFocusShow || showNodeDetailOnLoad === true) && $scope.nodeOverlayProps.enabled) {
                    //reset so only shows on snapshot load
                    showNodeDetailOnLoad = false;
                    isGrid = true;
                    //may not need
                    $scope.focusNode = data.node;
                    console.log('focus node: ', $scope.focusNode);
                    if($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') $scope.beginOverlayRightPanel= true;
                    else $scope.beginOverlayAnim = true;

                    animateGraphToOverlay();
                }
            }

            function onWindowResize() {
                if(!$scope.showOverlay) { return; }

                $timeout(function() {
                    $scope.nodeStartData = {
                        x: window.innerWidth/2-415,
                        y: window.innerHeight/2,
                        size: 150
                    };
                    $scope.nodeEndData = {
                        x: window.innerWidth/2-415,
                        y: window.innerHeight/2,
                        size: 150
                    };

                    $scope.scrollPaddingTop = $(window).height()/2 - $('#detailbox-scroll div:first-child').height()/2 - scrollOffset;

                });
            }

            function cancelOverlay(isChangingSnap) {
                // console.log('cancel zoom level: ', zoomService.currentZoomLevel());
                if(!$scope.showOverlay) { //assuming showOverlay is the flag to check if overlay is currently open
                    console.warn(logPrefix + 'overlay is not open, wrongly called!');
                    return;
                }
                //hide node pop and overlay
                $scope.beginOverlayRightPanel= false;
                $scope.beginOverlayAnim = false;
                $scope.showFocusNode = false;
                $scope.showNeighborNode = false;
                $scope.showOverlay = false;
                //reverse graph animation
                if(!isChangingSnap) {
                    // Shift camera so that current node(or neighbour) is positioned at initial node's position
                    if(initOverlayNodeData.node) {
                        zoomService.shiftSavedCamCoords(-1 * initOverlayNodeData.pos.x, -1 * initOverlayNodeData.pos.y);
                        initOverlayNodeData.node = null;
                    }
                    // remove selection from filter service panel
                    FilterPanelService.updateInitialSelection([]);
                    // restore camera
                    zoomService.restoreCamera();
                    // graphSelectionService.clearSelections();
                    $rootScope.$broadcast(BROADCAST_MESSAGES.nodeOverlay.removing, {clearSelections: true});
                }
                else {
                    $rootScope.$broadcast(BROADCAST_MESSAGES.nodeOverlay.removing, {clearSelections: false});
                }
            }

            function switchToNeighbor(node, $event) {

                $scope.hideContent = true;
                $scope.removeNeighborLine();

                $scope.neighborNode = dataGraph.getRenderableGraph().getNodeById(node.id);

                //get position of neighbor clicked
                var $nDiv = $($event.currentTarget);
                var pos = $nDiv.offset();
                var top = pos.top+$nDiv.height()/2;

                //objects to pass to dirNodeFocus
                //start position and size
                console.log('finishNeighborNode', pos,window);
                
                $scope.neighborNodeStartData = {
                    x: pos.left-390,
                    y: top,
                    size: 55
                };
                //end position and size
                $scope.neighborNodeEndData = {
                    x: window.innerWidth/2 - ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel' ? 375 : 415),
                    y: window.innerHeight/2 + ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel' ? 25 : 0),
                    size: 150
                };
                
                //finally show the node
                $scope.showNeighborNode = true;
                zoomPosition($scope.neighborNode, 10 / $scope.focusNode[camPrefix + 'size']);
                
            }

            function zoomPosition (node, rel= false){
                var relDefault = 10 / node[camPrefix + 'size'];                
                var pos = {
                    x: node.x,
                    y: node.y
                };

                var offset = {
                    x: 246,
                    y: 25
                };

                zoomService.zoomToOffsetPosition(pos, rel ? rel : relDefault, offset, Array(node));
            }

            function drawNeighborLine(node, similarity, $event) {
                //get position of neighbor over
                var $nDiv = $($event.currentTarget);
                var pos = $nDiv.offset();
                //use width because close to circle size
                var top = pos.top+$nDiv.width()/2;
                var left = pos.left+$nDiv.width()/2-390;
                var top2 = window.innerHeight/2;
                var left2 = window.innerWidth/2-415;
                drawLink(left, top, left2, top2, node.colorStr, $scope.focusNode.colorStr, !similarity ? 3 : Math.ceil(similarity*4));
                $scope.showNeighborLine = true;
            }

            function finishAnimation() {
                $scope.showOverlay = true;
                $scope.showNeighborNode = false;
                $scope.hideContent = false;
                $scope.neighborNode = null;

                $timeout(function() {
                    $scope.scrollPaddingTop = $(window).height()/2 - 240;
                    $scope.shareMarginTop = -($(window).height()/2 - $scope.scrollPaddingTop - 80);

                    $('#detailbox-scroll').on('scroll', function() {
                        $scope.removeNeighborLine();
                    });

                    $('.share-btn').on('mouseenter', function() {
                        $(this).css({
                            color: $scope.focusNode.colorStr,
                            borderColor: $scope.focusNode.colorStr
                        });
                    });

                    $('.share-btn').on('mouseleave', function() {
                        $(this).css({
                            color: '',
                            borderColor:''
                        });
                    });
                });


            }

            function animateGraphToOverlay() {
                $rootScope.$broadcast(BROADCAST_MESSAGES.nodeOverlay.creating);

                // Initialise attrs
                _buildNodeAttrsList();

                // console.log('zoomToOffsetPosition', $scope.focusNode);
                // console.log('zoomToOffsetPosition', getCenterPoint());

                if(!isGrid) {
                    //get ratio to zoom based on current size of node pop and final size of node pop
                    var relRatio = (($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') ? 10 : 50)/$scope.focusNode[camPrefix + 'size'];

                    //get amount to move graph based on node position and where it needs to end up
                    var pos = {
                        x: $scope.focusNode.x,
                        y: $scope.focusNode.y
                    };
                    var offset = {
                        x: 246,
                        y: 25
                    };

                    if($scope.showOverlay) {
                        initOverlayNodeData.pos.x = $scope.focusNode['read_camcam1:x'] - initOverlayNodeData.node['read_camcam1:x'];
                        initOverlayNodeData.pos.y = $scope.focusNode['read_camcam1:y'] - initOverlayNodeData.node['read_camcam1:y'];
                    }
                    else {
                        initOverlayNodeData.node = $scope.focusNode;
                    }

                    //save camera position (for going back)
                    if(!$scope.neighborNode && !$scope.showOverlay) {
                        zoomService.saveCamera();
                    }

                    //animate graph to position
                    zoomService.zoomToOffsetPosition(pos, relRatio, offset, Array($scope.focusNode));

                }

                //update attr display data
                _buildAttrsPrincipalVal();

                //push extra attr into nodeAttrs array if not already there so that
                //neighbors detail will be added in correct spot
                if($scope.mapprSettings.nodeFocusShowNeighbors) {
                    for(var i=0; i < $scope.allAttrs.length; i++) {
                        if((!$scope.nodeAttrs[i] || $scope.nodeAttrs[i].id != $scope.allAttrs[i].id) && $scope.mapprSettings.nodeFocusNeighborsBefore == $scope.allAttrs[i].id) {
                            $scope.nodeAttrs.splice(i, 0, $scope.allAttrs[i]);
                        }
                    }
                }

                //animate node focus to final position
                //objects to pass to dirNodeFocus
                //start position and size

                //if neighbor node, then node already in place so use end data as start data
                if($scope.neighborNode) {
                    //start position and size
                    $scope.nodeStartData = {
                        x: window.innerWidth/2-415,
                        y: window.innerHeight/2,
                        size: 150
                    };
                }else {
                    if(isGrid) {
                        $scope.nodeStartData = {
                            x: $scope.focusNode.gridX,
                            y: $scope.focusNode.gridY,
                            size: $scope.focusNode.gridSize
                        };
                    } else {
                        $scope.nodeStartData = {
                            x: $scope.focusNode[camPrefix + 'x'],
                            y: $scope.focusNode[camPrefix + 'y'] + 30,
                            size: $scope.mapprSettings.nodePopSize/10*75 + $scope.focusNode[camPrefix + 'size']
                        };
                    }
                }
                //end position and size
                $scope.nodeEndData = {
                    x: window.innerWidth/2-415,
                    y: window.innerHeight/2,
                    size: 150
                };

                //finally show the node if not content type, else just trigger overlay
                $scope.showFocusNode = true;
                if($scope.mapprSettings.nodeFocusRenderTemplate == 'content') {
                    $scope.finishAnimation();
                }else if ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel'){
                    var selNodes = graphSelectionService.getSelectedNodes();
                    var nodesa = selNodes[0];
                    // var dpAttrs =  $scope.dpAttrs

                    var nodeAttrsObj = dataGraph.getNodeAttrs();

                    const filteredAttr = nodeAttrsObj.filter(attr => {
                        return attr.visible && nodesa.attr[attr.title]
                    });

                    console.log({nodesa, nodeAttrsObj, filteredAttr}, 777);

                    mapRightPanel(filteredAttr, nodesa.attr);
                    // console.log('testNodeRightPanel', $scope.nodeRightInfo);
                    // console.log('testNodeRightPanel', $scope.mapprSettings);
                    // console.log('testNodeRightPanel', $scope.nodeAttrs);
                }

            }

            /*************************************
             ********* Helper functions for the attr map *************
             **************************************/

            function mapRightPanel(attrArray, values){
                $scope.nodeRightInfo = {
                    colorStr: $scope.focusNode ? $scope.focusNode.colorStr : '8bc2cd',
                    keywords: [],
                    keyboards: [],
                    events: [],
                    publications: [{}]
                };
                $scope.nodeRightInfo.name = '';
                attrArray.map( (attr) => {
                    if (isName(attr)) $scope.nodeRightInfo.name += values[attr.title] + ' ';
                    if (isLastName(attr)) $scope.nodeRightInfo.LastName = values[attr.title];
                    if (isDescription(attr)) $scope.nodeRightInfo.description = values[attr.title];
                    if (isVideo(attr)) $scope.nodeRightInfo.video = values[attr.title];
                    if (isTag(attr)){
                        const { title } = attr;
                        $scope.nodeRightInfo.keywords.push(values[title] instanceof Array ? values[title][0] : values[title]);
                    }
                    if(isPublication(attr)){
                        const { title } = attr;
                        $scope.nodeRightInfo.publications[0][title] = Number(values[title]).toFixed(2);
                    }
                    // if (isKeyboardList(attr)){
                    //     const { title } = attr;
                    //     console.log({attr});
                    //     $scope.nodeRightInfo.keyboards.push(values[title] instanceof Array ? values[title][0] : values[title]);
                    // }
                    if (isEvent(attr)) {
                        const {title} = attr;
                        $scope.nodeRightInfo.publications[0][title] = values[title];
                    }
                    if (isYouTube(attr)) $scope.nodeRightInfo.socialMedia.youtube = values[attr.title];
                    if (isLinkedIn(attr)) $scope.nodeRightInfo.socialMedia.linkedIn = values[attr.title];
                });
                console.log($scope.nodeRightInfo, 777);
            }

            /*************************************
             ********* Helper functions for the attr map *************
             **************************************/


            function removeFrac(num){
                return Number(num).toFixed(2);
            }

            function toM(num){
                return (num / 1000000).toFixed(2).toString() + 'M'
            }

            function parseToCommas(num){
                return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
            }

            function isName(attr){
                const { attrType, renderType, id } = attr;
                return attrType === 'string' && renderType === 'text' && id.toLowerCase().includes('name');
            }

            function isLastName(attr){
                const { attrType, renderType, id } = attr;
                return attrType === 'string' && renderType === 'text' && id === 'Last Name';
            }

            function isTag(attr){
                const { attrType, renderType } = attr;
                return attrType === 'liststring' && renderType === 'tag-cloud';
            }

            function isDescription(attr){
                const { attrType, renderType, id } = attr;
                return attrType === 'string' && renderType === 'text' && id === 'description' || id === 'Short Bio';
            }
            function isPublication(attr){
                const { attrType, renderType } = attr;
                return renderType === 'histogram' &&
                   ( attrType === 'string'
                    || attrType === 'float'
                    || attrType === 'year'
                    || attrType === 'timestamp' )

            }
            function isVideo(attr) {
                const { attrType, renderType, id } = attr;
                return attrType === 'video' && renderType === 'default' && id === 'video';
            }

            function isEvent(attr){
                const { attrType, renderType } = attr;
                return attrType === 'string' && renderType === 'tag-cloud';
            }

            function isYouTube(attr){
                const { principalVal } = attr;
                return principalVal != undefined && principalVal.toLowerCase().includes('youtube');
            }

            function isLinkedIn(attr){
                const { principalVal } = attr;
                return principalVal != undefined && principalVal.toLowerCase().includes('linkedin');
            }


            //for drawing div line
            function drawLink(x1, y1, x2, y2, color1, color2, height){
                //swap colors if y1 > y2
                if(y1 > y2) {
                    var c = color1;
                    color1 = color2;
                    color2 = c;
                }

                if(y1 < y2){
                    var pom = y1;
                    y1 = y2;
                    y2 = pom;
                    pom = x1;
                    x1 = x2;
                    x2 = pom;
                }

                var a = Math.abs(x1-x2);
                var b = Math.abs(y1-y2);
                var sx = (x1+x2)/2 ;
                var sy = (y1+y2)/2 ;
                var width = Math.sqrt(a*a + b*b ) ;
                var x = sx - width/2;
                var y = sy;

                a = width / 2;

                c = Math.abs(sx-x);

                b = Math.sqrt(Math.abs(x1-x)*Math.abs(x1-x)+Math.abs(y1-y)*Math.abs(y1-y) );

                var cosb = (b*b - a*a - c*c) / (2*a*c);
                var rad = Math.acos(cosb);
                var deg = (rad*180)/Math.PI;
                var $div = $('.neighbor-line');
                console.log('height: ', height);
                $div.css({
                    width: width,
                    height: height,
                    transform: 'rotate('+deg+'deg)',
                    position:'absolute',
                    top:y,
                    left:x,
                    background: 'linear-gradient(to right, '+color1+', '+color2+')'
                });

            }

            function _buildNodeAttrsList() {
                var infoObj = AttrInfoService.getNodeAttrInfoForRG();
                var nodeAttrs = dataGraph.getNodeAttrs();
                $scope.allAttrs = _.clone(nodeAttrs);
                $scope.nodeAttrs = [];
                $scope.nodeInfoAttrs = [];

                _.each(nodeAttrs, function(attr) {
                    var attrClone = _.clone(attr);
                    var attrInfo = infoObj.getForId(attr.id);
                    var isInfoAttr = !AttrInfoService.isDistrAttr(attr, attrInfo);
                    attrClone.principalVal = null;
                    attrClone.isInfoAttr = isInfoAttr;
                    attrClone.showFilter = false;
                    if(isInfoAttr) {
                        attrClone.showRenderer = AttrInfoService.shouldRendererShowforSN(attr.attrType, attr.renderType);
                    }
                    else {
                        attrClone.showRenderer = true;
                    }
                    $scope.nodeAttrs.push(attrClone);

                    if(!AttrInfoService.isDistrAttr(attr, infoObj.getForId(attr.id))) {
                        $scope.nodeInfoAttrs.push(attrClone);
                    }
                });

            }

            function _buildAttrsPrincipalVal() {
                _.each($scope.nodeAttrs, function(attr) {
                    attr.principalVal = $scope.focusNode.attr[attr.id];
                    if(attr.principalVal){ //if value exists perform updates else skip
                        if(attr.attrType == 'float') {
                            if(_.isFunction(attr.principalVal.toFixed)) {
                                attr.principalVal = attr.principalVal.toFixed(2);
                            }
                            else {
                                console.warn("attrType & inferred type from value don\'t match for attrType - float and attrVal - ", attr.principalVal);
                            }
                        }
                    }
                });
            }

            function activeTabs(tab, active){
                $scope.active[tab] = active;
            }

            //pending

            function getCenterPoint(){
                var neighbor = getNeihbors();
                neighbor.forEach((e) => {
                    console.log('getCenterPoint', e);
                });
            }

            function getNeihbors(){
                var  hasLinks, incomingEdgesIndex, outgoingEdgesIndex;
                var node = $scope.focusNode;
                var dataset = dataGraph.getRawDataUnsafe();
                incomingEdgesIndex = dataset.edgeInIndex[node.id];
                outgoingEdgesIndex = dataset.edgeOutIndex[node.id];
                hasLinks = $scope.hasLinks = _.size(incomingEdgesIndex) + _.size(outgoingEdgesIndex) > 0;
                if (hasLinks || $scope.extLinkedNodes) {
                   return linkService.constructLinkInfo(node, incomingEdgesIndex, outgoingEdgesIndex, $scope.mapprSettings.labelAttr, $scope.mapprSettings.nodeImageAttr);;
                } else {
                    console.log('dirNeighbors', "Node has no links to other nodes");
                }
            }
        }
    ]);
