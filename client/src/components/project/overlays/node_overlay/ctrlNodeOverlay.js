angular.module('common')
    .controller('NodeOverlayCtrl', ['$scope', '$rootScope', '$timeout', 'BROADCAST_MESSAGES', 'zoomService', 'nodeSelectionService', 'renderGraphfactory', 'dataGraph', 'graphSelectionService', 'partitionService', 'FilterPanelService', 'AttrInfoService', 'linkService', 'hoverService', 'selectService',
        function ($scope, $rootScope, $timeout, BROADCAST_MESSAGES, zoomService, nodeSelectionService, renderGraphfactory, dataGraph, graphSelectionService, partitionService, FilterPanelService, AttrInfoService, linkService, hoverService, selectService) {
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
                pos: { x: 0, y: 0 }
            };

            /*************************************
            ********* Scope Bindings *************
            **************************************/
            /**
    *  Scope data
    */
            $scope.mockData = true;
            $scope.beginOverlayAnim = false;
            $scope.beginOverlayRightPanel = false;
            $scope.showOverlayFocusNode = false;
            $scope.showOverlay = false;
            $scope.hideContent = true;
            $scope.showNeighborLine = false;
            $scope.nodeAttrs = [];
            $scope.sectionActive2 = 0;
            $scope.sectionActive3 = 0;
            $scope.nodeRightInfo = {};

            /**
            * Scope methods
            */
            $scope.cancelOverlay = cancelOverlay;
            $scope.switchToNeighbor = switchToNeighbor; //neighbor switch stuff
            $scope.drawNeighborLine = drawNeighborLine; //neighbor line drawing
            $scope.finishAnimation = finishAnimation; //for when finished (show overlay)
            $scope.activeTabs2 = activeTabs2;
            $scope.activeTabs3 = activeTabs3;
            $scope.Section4Largest = 0;

            $scope.onSectionHover = onSectionHover;
            $scope.onSectionLeave = onSectionLeave;
            $scope.onSectionSelect = onSectionSelect;

            $scope.removeNeighborLine = function () {
                //kill line
                $scope.showNeighborLine = false;
            };


            $scope.attrRenderClicked = function () {
                $scope.cancelOverlay(true);
            };

            //for when finished (show overlay)
            $scope.finishNeighborAnimation = function () {
                $scope.showFocusNode = false;
            };

            /*************************************
            ****** Event Listeners/Watches *******
            **************************************/
            $(window).on('resize', onWindowResize); //on resize, move node to correct position
            $scope.$on(BROADCAST_MESSAGES.hss.select, onNodesSelect);
            $scope.$on(BROADCAST_MESSAGES.grid.clickNode, onClickNode); //if in grid
            $scope.$on(BROADCAST_MESSAGES.list.clickNode, onClickNode); //if in list

            $scope.$on(BROADCAST_MESSAGES.snapshot.loaded, function onSnapLoad(e, data) {
                snapData = data;
                if (snapData.snapshot) {
                    showNodeDetailOnLoad = snapData.snapshot.layout.settings.showNodeDetailOnLoad && $scope.mapprSettings.nodeFocusShow;
                }
            });
            $scope.$on(BROADCAST_MESSAGES.snapshot.changed, function onSnapChange(e, data) {
                $scope.cancelOverlay(true);
                snapData = data;
                if (snapData.snapshot) {
                    showNodeDetailOnLoad = snapData.snapshot.layout.settings.showNodeDetailOnLoad && $scope.mapprSettings.nodeFocusShow;
                }
            });

            $scope.$on(BROADCAST_MESSAGES.sigma.clickStage, function() {
                $scope.cancelOverlay();
            });

            $scope.$on(BROADCAST_MESSAGES.nodeOverlay.highlightText, function (e, data) {
                $scope.searchQuery = _.get(data, 'text', '');
            });

            $scope.$on(BROADCAST_MESSAGES.nodeOverlay.remove, function () {
                $scope.cancelOverlay();
            });

            $scope.$on(BROADCAST_MESSAGES.dataGraph.nodeAttrsUpdated, function () {
                _buildNodeAttrsList();
                if ($scope.focusNode) {
                    _buildAttrsPrincipalVal();
                }
            });

            $scope.$on(BROADCAST_MESSAGES.layout.attrClicked, function (event, data) {
                var infoObj = AttrInfoService.getNodeAttrInfoForRG();
                var attr = data.attr;
                var ele = angular.element(document.getElementById('overlayattr-' + attr.id));
                if (ele.length === 1) {
                    $timeout(function () {
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
                if (data.nodes.length == 0) {
                    $scope.cancelOverlay();
                    return;
                }
                // TODO: correct this bug
                // if(!$scope.mapprSettings) return;
                // else if(($scope.mapprSettings.nodeFocusShow || showNodeDetailOnLoad === true)
                // TODO: restore validation
                if (!$scope.mapprSettings) return;
                else if ($scope.mapprSettings.nodeFocusShow
                    && $scope.nodeOverlayProps.enabled && $scope.layout.plotType !== 'grid') {
                    if (_.isArray(data.nodes) && data.nodes.length === 1) {
                        //reset so only shows on snapshot load
                        showNodeDetailOnLoad = false;
                        isGrid = false;
                        //may not need
                        $scope.focusNode = data.nodes[0];
                        if ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') $scope.beginOverlayRightPanel = true;
                        else $scope.beginOverlayAnim = true;

                        animateGraphToOverlay();
                        // Hack for scrolling up on changing the nodes
                        var container = document.querySelector('.nameContainer');
                        if (container) {
                            container.parentElement.scrollIntoView();
                        }
                    }
                    else if (_.isArray(data.nodes) && data.nodes.length > 1) {
                        $scope.cancelOverlay(true);
                    }
                }
            }

            function onClickNode(e, data) {
                if (($scope.mapprSettings.nodeFocusShow || showNodeDetailOnLoad === true) && $scope.nodeOverlayProps.enabled) {
                    //reset so only shows on snapshot load
                    showNodeDetailOnLoad = false;
                    isGrid = true;
                    //may not need
                    $scope.focusNode = data.node;
                    console.log('focus node: ', $scope.focusNode);
                    if ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') $scope.beginOverlayRightPanel = true;
                    else $scope.beginOverlayAnim = true;

                    animateGraphToOverlay();
                }
            }

            function onWindowResize() {
                if (!$scope.showOverlay) { return; }

                $timeout(function () {
                    $scope.nodeStartData = {
                        x: window.innerWidth / 2 - 415,
                        y: window.innerHeight / 2,
                        size: 150
                    };
                    $scope.nodeEndData = {
                        x: window.innerWidth / 2 - 415,
                        y: window.innerHeight / 2,
                        size: 150
                    };

                    $scope.scrollPaddingTop = $(window).height() / 2 - $('#detailbox-scroll div:first-child').height() / 2 - scrollOffset;

                });
            }

            function cancelOverlay(isChangingSnap) {
                // console.log('cancel zoom level: ', zoomService.currentZoomLevel());
                if (!$scope.showOverlay) { //assuming showOverlay is the flag to check if overlay is currently open
                    console.warn(logPrefix + 'overlay is not open, wrongly called!');
                    return;
                }
                //hide node pop and overlay
                $scope.beginOverlayRightPanel = false;
                $scope.beginOverlayAnim = false;
                $scope.showFocusNode = false;
                $scope.showNeighborNode = false;
                $scope.showOverlay = false;
                //reverse graph animation
                if (!isChangingSnap) {
                    // Shift camera so that current node(or neighbour) is positioned at initial node's position
                    if (initOverlayNodeData.node) {
                        zoomService.shiftSavedCamCoords(-1 * initOverlayNodeData.pos.x, -1 * initOverlayNodeData.pos.y);
                        initOverlayNodeData.node = null;
                    }
                    // remove selection from filter service panel
                    selectService.unselect();
                    // restore camera
                    zoomService.restoreCamera();
                    // graphSelectionService.clearSelections();
                    $rootScope.$broadcast(BROADCAST_MESSAGES.nodeOverlay.removing, { clearSelections: true });
                }
                else {
                    $rootScope.$broadcast(BROADCAST_MESSAGES.nodeOverlay.removing, { clearSelections: false });
                }
            }

            function switchToNeighbor(node, $event) {

                $scope.hideContent = true;
                $scope.removeNeighborLine();

                $scope.neighborNode = dataGraph.getRenderableGraph().getNodeById(node.id);

                //get position of neighbor clicked
                var $nDiv = $($event.currentTarget);
                var pos = $nDiv.offset();
                var top = pos.top + $nDiv.height() / 2;

                //objects to pass to dirNodeFocus
                //start position and size
                console.log('finishNeighborNode', pos, window);

                $scope.neighborNodeStartData = {
                    x: pos.left - 390,
                    y: top,
                    size: 55
                };
                //end position and size
                $scope.neighborNodeEndData = {
                    x: window.innerWidth / 2 - ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel' ? 375 : 415),
                    y: window.innerHeight / 2 + ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel' ? 25 : 0),
                    size: 150
                };

                //finally show the node
                $scope.showNeighborNode = true;
                zoomPosition($scope.neighborNode, 10 / $scope.focusNode[camPrefix + 'size']);

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

                $timeout(function () {
                    $scope.scrollPaddingTop = $(window).height() / 2 - 240;
                    $scope.shareMarginTop = -($(window).height() / 2 - $scope.scrollPaddingTop - 80);

                    $('#detailbox-scroll').on('scroll', function () {
                        $scope.removeNeighborLine();
                    });

                    $('.share-btn').on('mouseenter', function () {
                        $(this).css({
                            color: $scope.focusNode.colorStr,
                            borderColor: $scope.focusNode.colorStr
                        });
                    });

                    $('.share-btn').on('mouseleave', function () {
                        $(this).css({
                            color: '',
                            borderColor: ''
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

                if (!isGrid) {
                    //get ratio to zoom based on current size of node pop and final size of node pop
                    var relRatio = (($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') ? 10 : 50) / $scope.focusNode[camPrefix + 'size'];

                    //get amount to move graph based on node position and where it needs to end up
                    var pos = {
                        x: $scope.focusNode.x - (($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') ? 40 : 0),
                        y: $scope.focusNode.y
                    };
                    var offset = {
                        x: 246,
                        y: 25
                    };

                    if ($scope.showOverlay) {
                        initOverlayNodeData.pos.x = $scope.focusNode['read_camcam1:x'] - initOverlayNodeData.node['read_camcam1:x'];
                        initOverlayNodeData.pos.y = $scope.focusNode['read_camcam1:y'] - initOverlayNodeData.node['read_camcam1:y'];
                    }
                    else {
                        initOverlayNodeData.node = $scope.focusNode;
                    }

                    //save camera position (for going back)
                    if (!$scope.neighborNode && !$scope.showOverlay) {
                        zoomService.saveCamera();
                    }

                    //animate graph to position
                    //zoomService.zoomToOffsetPosition(pos, relRatio, offset, Array($scope.focusNode));
                    zoomService.centerNode($scope.focusNode);

                }

                //update attr display data
                _buildAttrsPrincipalVal();

                //push extra attr into nodeAttrs array if not already there so that
                //neighbors detail will be added in correct spot
                if ($scope.mapprSettings.nodeFocusShowNeighbors) {
                    for (var i = 0; i < $scope.allAttrs.length; i++) {
                        if ((!$scope.nodeAttrs[i] || $scope.nodeAttrs[i].id != $scope.allAttrs[i].id) && $scope.mapprSettings.nodeFocusNeighborsBefore == $scope.allAttrs[i].id) {
                            $scope.nodeAttrs.splice(i, 0, $scope.allAttrs[i]);
                        }
                    }
                }

                //animate node focus to final position
                //objects to pass to dirNodeFocus
                //start position and size

                //if neighbor node, then node already in place so use end data as start data
                if ($scope.neighborNode) {
                    //start position and size
                    $scope.nodeStartData = {
                        x: window.innerWidth / 2 - 415,
                        y: window.innerHeight / 2,
                        size: 150
                    };
                } else {
                    if (isGrid) {
                        $scope.nodeStartData = {
                            x: $scope.focusNode.gridX,
                            y: $scope.focusNode.gridY,
                            size: $scope.focusNode.gridSize
                        };
                    } else {
                        $scope.nodeStartData = {
                            x: $scope.focusNode[camPrefix + 'x'],
                            y: $scope.focusNode[camPrefix + 'y'] + 30,
                            size: $scope.mapprSettings.nodePopSize / 10 * 75 + $scope.focusNode[camPrefix + 'size']
                        };
                    }
                }
                //end position and size
                $scope.nodeEndData = {
                    x: window.innerWidth / 2 - 415,
                    y: window.innerHeight / 2,
                    size: 150
                };

                //finally show the node if not content type, else just trigger overlay
                $scope.showFocusNode = true;
                if ($scope.mapprSettings.nodeFocusRenderTemplate == 'content') {
                    $scope.finishAnimation();
                } else if ($scope.mapprSettings.nodeFocusRenderTemplate == 'node-right-panel') {
                    var selNodes = selectService.singleNode ? [selectService.singleNode] : selectService.getSelectedNodes();
                    var nodesa = selNodes[0];

                    var nodeAttrsObj = dataGraph.getNodeAttrs();

                    const filteredAttr = nodeAttrsObj.filter(attr => {
                        return attr.visible && nodesa.attr[attr.id]
                    });

                    console.log($scope.mapprSettings, 7778);
                    console.log({ nodesa, nodeAttrsObj, filteredAttr }, 7778);

                    mapRightPanel(filteredAttr, nodesa.attr);
                }

            }

            /*************************************
             ********* Helper functions for the attr map *************
             **************************************/

            function mapRightPanel(attrArray, values) {
                var result = {
                    section1: [],
                    section2: [],
                    section3: [],
                    section4: [],
                    section5: [],
                };

                result.section1.push(getNodeName(values));

                attrArray.map((attr) => {
                    if (mapToSectionOne(attr)) result.section1.push({ ...setToSectionOne(attr, values[attr.id]) });
                    if (mapToSectionTwo(attr)) result.section2.push({ key: attr.title ? attr.title : attr.id, value: values[attr.id] });
                    if (mapToSectionThree(attr)) result.section3.push({ key: attr.title ? attr.title : attr.id, value: values[attr.id] });
                    if (mapToSectionFour(attr)) result.section4.push({ key: attr.title ? attr.title : attr.id, value: parseValueToSection4(attr, values[attr.id]) });
                    if (mapToSectionFive(attr)) result.section5.push({ key: attr.title ? attr.title : attr.id, value: values[attr.id] });
                });


                $scope.nodeRightInfo = result;
                console.log(result, 7778);

            }

            function parseValueToSection4(attr, value) {

                const { attrType, id } = attr;

                console.log({ value: parseInt(value).toLocaleString(), original: value, attrType, attr }, 7778)

                const largestLn = id.length > value.length ? id.length : `${value}`.length;
                if ($scope.Section4Largest < largestLn * 7) $scope.Section4Largest = largestLn * 7;

                if (attrType === 'timestamp') {
                    return new Date(value * 1000).toDateString();
                }
                if (attrType === 'integer' || attrType === 'float') {
                    return parseFloat(value).toLocaleString();
                }

                return value
            }

            function getNodeName(values) {
                const Name = values[$scope.mapprSettings.labelAttr];

                if (Name !== undefined) {
                    const nameThatExists = Name;
                    //
                    const [name, description] = nameThatExists.split(':');
                    const [first, last] = name.split('');
                    const initials = first[0] + last[0];
                    return ({
                        type: 'name',
                        name,
                        description,
                        initials,
                        color: $scope.focusNode ? $scope.focusNode.colorStr : '8bc2cd',
                        imageShow: $scope.mapprSettings.nodeImageShow,
                        image: values[$scope.mapprSettings.nodeImageAttr]
                    })
                }
            }

            function getLinkIcon(url) {
                if (url.includes('facebook.com')) return 'https://image.flaticon.com/icons/svg/733/733549.svg';
                if (url.includes('twitter.com')) return 'https://image.flaticon.com/icons/svg/2111/2111688.svg';
                if (url.includes('linkedin.com')) return 'https://image.flaticon.com/icons/svg/2111/2111499.svg'
                if (url.includes('crunchbase.com')) return 'data:image/png;base64,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';
                if (url.includes('ted.com')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/TED_three_letter_logo.svg/1024px-TED_three_letter_logo.svg.png';
                return 'https://image.flaticon.com/icons/svg/455/455691.svg'
            }

            function getLinkTooltip(url) {
                if (url.includes('facebook.com')) return 'Facebook.com';
                if (url.includes('twitter.com')) return 'Twitter.com';
                if (url.includes('linkedin.com')) return 'Linkedin.com';
                if (url.includes('crunchbase.com')) return 'Crunchbase.com';
                if (url.includes('ted.com')) return 'Ted.com';
                return 'External Link';

            }


            function setToSectionOne(attr, value = '') {
                if (attr.attrType === 'url') return ({ type: 'link', icon: getLinkIcon(value), value, tooltip: getLinkTooltip(value) });
            }

            function onSectionHover(sections, tag) {
                hoverService.hoverNodes({ attr: sections.key, value: tag});
            }

            function onSectionSelect(sections, tag) {
                var node = selectService.singleNode;
                selectService.selectNodes({ attr: sections.key, value: tag});
                selectService.selectSingleNode(node.id);
            }

            function onSectionLeave() {
                hoverService.unhover();
            }

            /*************************************
             ********* Helper functions for the attr map *************
             **************************************/
            function mapToSectionOne(attr) {
                const { attrType, renderType, id } = attr;

                return (attrType === 'string' && renderType === 'text' && id === 'Name') ||
                    (attrType === 'url' && renderType === 'default')

            }
            function mapToSectionTwo(attr) {
                const { attrType, renderType } = attr;

                return (attrType === 'string' && renderType === 'text') ||
                    (attrType === 'video' && renderType === 'default') ||
                    (attrType === 'picture' && renderType === 'default') ||
                    (attrType === 'audio_stream' && renderType === 'default') ||
                    (attrType === 'video_stream' && renderType === 'default') ||
                    (attrType === 'twitter' && renderType === 'default') ||
                    (attrType === 'instagram' && renderType === 'default')
            }
            function mapToSectionThree(attr) {
                const { attrType, renderType } = attr;

                return (attrType === 'liststring' && renderType === 'tag-cloud')
            }
            function mapToSectionFour(attr) {
                const { attrType, renderType } = attr;

                return (attrType === 'integer' && renderType === 'histogram') ||
                    (attrType === 'float' && renderType === 'histogram') ||
                    (attrType === 'year' && renderType === 'histogram') ||
                    (attrType === 'timestamp' && renderType === 'histogram')
            }
            function mapToSectionFive(attr) {
                const { attrType, renderType } = attr;

                return (attrType === 'string' && renderType === 'tag-cloud')
            }

            function getName(completeName) {
                var names = completeName.split(':');
                if (names.length == 2) {
                    return {
                        name: names[0],
                        description: names[1]
                    }
                }
                return { name: completeName };
            }
            function formatDate(num) {
                var date = new Date(num);
                var day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
                var month = (date.getMonth() + 1) < 10 ? `0${(date.getMonth() + 1)}` : (date.getMonth() + 1);
                var year = date.getFullYear();

                return day + "/" + month + "/" + year;
            }
            function numberFormat(number) {
                return new Intl.NumberFormat().format(number);;
            }
            function toM(num) {
                return (num / 1000000).toFixed(2).toString() + 'M'
            }
            function parseToCommas(num) {
                return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
            }

            //for drawing div line
            function drawLink(x1, y1, x2, y2, color1, color2, height) {
                //swap colors if y1 > y2
                if (y1 > y2) {
                    var c = color1;
                    color1 = color2;
                    color2 = c;
                }

                if (y1 < y2) {
                    var pom = y1;
                    y1 = y2;
                    y2 = pom;
                    pom = x1;
                    x1 = x2;
                    x2 = pom;
                }

                var a = Math.abs(x1 - x2);
                var b = Math.abs(y1 - y2);
                var sx = (x1 + x2) / 2;
                var sy = (y1 + y2) / 2;
                var width = Math.sqrt(a * a + b * b);
                var x = sx - width / 2;
                var y = sy;

                a = width / 2;

                c = Math.abs(sx - x);

                b = Math.sqrt(Math.abs(x1 - x) * Math.abs(x1 - x) + Math.abs(y1 - y) * Math.abs(y1 - y));

                var cosb = (b * b - a * a - c * c) / (2 * a * c);
                var rad = Math.acos(cosb);
                var deg = (rad * 180) / Math.PI;
                var $div = $('.neighbor-line');
                console.log('height: ', height);
                $div.css({
                    width: width,
                    height: height,
                    transform: 'rotate(' + deg + 'deg)',
                    position: 'absolute',
                    top: y,
                    left: x,
                    background: 'linear-gradient(to right, ' + color1 + ', ' + color2 + ')'
                });

            }

            function _buildNodeAttrsList() {
                var infoObj = AttrInfoService.getNodeAttrInfoForRG();
                var nodeAttrs = dataGraph.getNodeAttrs();
                $scope.allAttrs = _.clone(nodeAttrs);
                $scope.nodeAttrs = [];
                $scope.nodeInfoAttrs = [];

                _.each(nodeAttrs, function (attr) {
                    var attrClone = _.clone(attr);
                    var attrInfo = infoObj.getForId(attr.id);
                    var isInfoAttr = !AttrInfoService.isDistrAttr(attr, attrInfo);
                    attrClone.principalVal = null;
                    attrClone.isInfoAttr = isInfoAttr;
                    attrClone.showFilter = false;
                    if (isInfoAttr) {
                        attrClone.showRenderer = AttrInfoService.shouldRendererShowforSN(attr.attrType, attr.renderType);
                    }
                    else {
                        attrClone.showRenderer = true;
                    }
                    $scope.nodeAttrs.push(attrClone);

                    if (!AttrInfoService.isDistrAttr(attr, infoObj.getForId(attr.id))) {
                        $scope.nodeInfoAttrs.push(attrClone);
                    }
                });

            }

            function _buildAttrsPrincipalVal() {
                _.each($scope.nodeAttrs, function (attr) {
                    attr.principalVal = $scope.focusNode.attr[attr.id];
                    if (attr.principalVal) { //if value exists perform updates else skip
                        if (attr.attrType == 'float') {
                            if (_.isFunction(attr.principalVal.toFixed)) {
                                attr.principalVal = attr.principalVal.toFixed(2);
                            }
                            else {
                                console.warn("attrType & inferred type from value don\'t match for attrType - float and attrVal - ", attr.principalVal);
                            }
                        }
                    }
                });
            }

            function activeTabs2(newValue) {
                $scope.sectionActive2 = newValue;
            }

            function activeTabs3(newValue) {
                $scope.sectionActive3 = newValue;
            }

            //pending

            function getCenterPoint() {
                var neighbor = getNeihbors();
                neighbor.forEach((e) => {
                    console.log('getCenterPoint', e);
                });
            }

            function getNeihbors() {
                var hasLinks, incomingEdgesIndex, outgoingEdgesIndex;
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
