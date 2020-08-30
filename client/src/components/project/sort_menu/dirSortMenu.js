// Receives
// 1) list of possible sort options
// 2) sortConfig object which will be modified by this directive acc. to user interaction.
// Thus, parent can listen to changes to config and render lists accordingly.

// Sort orders are common => ascending & descending
angular.module('common')
.directive('dirSortMenu', ['AttrInfoService', function(AttrInfoService) {
    'use strict';

    /*************************************
    ******** Directive description *******
    **************************************/
    var dirDefn = {
        restrict: 'E',
        scope: {
            sortTypes: '=', // List of Sort types objects eg. {id: 'alphabetical', title: 'Alphabetical'}
            sortConfig: '=', // Model for sort => {sortType: 'alphabetical', sortOrder: 'desc'}
            alignToRight: '<'
        },
        templateUrl: '#{server_prefix}#{view_path}/components/project/sort_menu/sortMenu.html',
        link: postLinkFn
    };

    /*************************************
    ************ Local Data **************
    **************************************/

    var sortOrders = [
        {
            id: 'asc',
            title: 'Ascending'
        },
        {
            id: 'desc',
            title: 'Descending'
        }
    ];


    /*************************************
    ******** Controller Function *********
    **************************************/


    /*************************************
    ******** Post Link Function *********
    **************************************/
    function postLinkFn(scope) {

        scope.ui = {
            menuOpen: false
        };

        scope.sortOrders = sortOrders;

        scope.$watch('sortConfig.sortType', function() {
            if (!scope.sortConfig) return;
            var attrInfo = AttrInfoService.getNodeAttrInfoForRG().getForId(scope.sortConfig.sortType);

            switch(attrInfo.attr.attrType) {
                case 'integer':
                case 'float': 
                case 'year': 
                case 'timestamp': {
                    scope.isAbc = false;
                    break;
                }
                default: {
                    scope.isAbc = true;
                    break;
                }
            }
        });

        scope.setSortOrder = function setSortOrder(sortOrder, $event) {
            var newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            scope.sortConfig = scope.sortConfig || {};
            scope.sortConfig.sortOrder = newSortOrder;
            //attrInfo = ;
            console.log('sortmenu setSortOder');
            $event.stopPropagation();
        }
    
        scope.setSortType = function setSortType(sortType, $event) {
            scope.sortConfig = scope.sortConfig || {};
            scope.sortConfig.sortType = sortType;
            console.log('sortmenu setSortType');
            $event.stopPropagation();
        }

        scope.getSortTypeLabel = function getSortTypeLabel(sortType) {
            var sortConfig = _.find(scope.sortTypes, { id: sortType })
            return sortConfig && sortConfig.title;
        }
    }



    /*************************************
    ************ Local Functions *********
    **************************************/


    return dirDefn;
}
]);
