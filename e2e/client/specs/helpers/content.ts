import {element, by, browser} from 'protractor';
import {acceptConfirm, nav} from './utils';
import {multiAction} from './actions';
import {ECE, el} from '@superdesk/end-to-end-testing-helpers';

class Content {
    send: any;
    setListView: any;
    setGridView: any;
    getItems: any;
    getItem: (item: any) => any;
    actionOnItem: (action: any, item: any, useFullLinkText?: any, confirm?: any) => void;
    editItem: (item: any) => any;
    openItemMenu: any;
    previewItem: (item: any) => void;
    closePreview: () => void;
    getCount: any;
    getItemCount: any;
    count: any;
    selectItem: (item: any) => any;
    spikeItems: () => void;
    unspikeItems: () => void;
    selectSpikedList: () => void;
    createPackageFromItems: () => void;
    getWidgets: any;
    getItemType: any;

    constructor() {
        this.send = send;

        this.setListView = function(noNavigate) {
            if (noNavigate === undefined || !noNavigate) {
                nav('workspace/content');
            }

            var _list = element(by.css('i.icon-th-list'));

            return _list.isDisplayed()
                .then((isVisible) => {
                    if (isVisible) {
                        _list.click();
                    }
                });
        };

        this.setGridView = function() {
            var grid = element(by.css('[tooltip="switch to grid view"]'));

            return grid.then((isVisible) => {
                if (isVisible) {
                    grid.click();
                }
            });
        };

        this.getItems = function() {
            return element.all(by.className('media-box'));
        };

        this.getItem = function(item) {
            return this.getItems().filter(testHeadline)
                .first();

            function testHeadline(elem, index) {
                if (typeof item === 'number') {
                    // BC: get item by its index
                    return index === item;
                }

                return elem.element(by.className('item-heading')).getText()
                    .then((text) => text.toLowerCase().indexOf(item) >= 0);
            }
        };

        this.actionOnItem = function(action, item, useFullLinkText, confirm) {
            var menu = this.openItemMenu(item);

            if (useFullLinkText) {
                menu.element(by.buttonText(action)).click();
            } else {
                menu.all(by.partialButtonText(action))
                    .first()
                    .click();
            }

            if (confirm) {
                acceptConfirm();
            }
        };

        this.editItem = function(item) {
            return this.actionOnItem('Edit', item);
        };

        function waitFor(elem, time?) {
            browser.wait(() => elem.isPresent(), time || 1000);
            return browser.wait(() => elem.isDisplayed(), time || 1000);
        }

        this.openItemMenu = function(item) {
            const itemElem = this.getItem(item);

            browser.actions()
                .mouseMove(itemElem, {x: -50, y: -50}) // first move out
                .mouseMove(itemElem) // now it can mouseover for sure
                .perform();

            el(['context-menu-button'], null, itemElem).click();

            const menu = el(['context-menu']);

            waitFor(menu, 2000);
            return menu;
        };

        this.previewItem = function(item) {
            this.getItem(item).click();

            var preview = element(by.id('item-preview'));

            waitFor(preview);
        };

        this.closePreview = function() {
            element(by.className('close-preview')).click();
        };

        var list = element(by.className('list-view'));

        this.getCount = function() {
            browser.wait(ECE.presenceOf(list));
            return list.all(by.css('.media-box')).count();
        };

        this.getItemCount = function() {
            waitFor(list);
            return list.all(by.css('.media-box')).count();
        };

        /**
         * @alias this.getCount
         */
        this.count = this.getCount;

        this.selectItem = function(item) {
            var crtItem = this.getItem(item);
            var typeIcon = crtItem.element(by.css('[data-test-id="item-type-and-multi-select"]'));

            expect(typeIcon.isDisplayed()).toBe(true);
            browser.actions()
                .mouseMove(typeIcon)
                .mouseMove(crtItem)
                .mouseMove(typeIcon)
                .perform();
            return typeIcon.click();
        };

        this.spikeItems = function() {
            multiAction('Spike');
            acceptConfirm();
        };

        this.unspikeItems = function() {
            multiAction('Unspike');
            element(by.buttonText('send')).click();
        };

        this.selectSpikedList = function() {
            nav('workspace/spike-monitoring');
        };

        this.createPackageFromItems = function() {
            var elem = element(by.css('[class="multi-action-bar ng-scope"]'));

            elem.element(by.className('big-icon--create-package')).click();
            browser.sleep(500);
        };

        this.getWidgets = function() {
            return element(by.className('navigation-tabs')).all(by.repeater('widget in widgets'));
        };

        this.getItemType = function(itemType) {
            var itemTypeClass = 'filetype-icon-' + itemType;

            return element(by.className('authoring-header__general-info'))
                .all(by.className(itemTypeClass))
                .first();
        };

        function send() {
            return element(by.css('[ng-click="send()"]')).click();
        }
    }
}

export const content = new Content();
