// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

/// <deploy src="../TestData/" />

module WinJSTests {
    var highlightStyle = document.createElement("style");
    highlightStyle.innerHTML = "button:focus { background-color: red; }";

    function createAndAppendFocusableElement(x: number, y: number, container: HTMLElement, textContent?: string, tagName = "button", width = 150, height = 150) {
        var e = document.createElement(tagName);
        e.style.position = "absolute";
        e.style.width = width + "px";
        e.style.height = height + "px";
        e.style.left = x + "px";
        e.style.top = y + "px";
        e.tabIndex = 0;

        e["width"] = width;
        e["height"] = height;

        if (textContent) {
            e.textContent = textContent;
        }
        container.appendChild(e);
        return e;
    }

    function createCrossLayout(container?: HTMLElement) {
        /*
         *   1
         * 2 3 4
         *   5
         */

        if (!container) {
            container = document.createElement("div");
            container.style.position = "absolute";
            container.style.width = container.style.height = "600px";
        }
        return [
            container,
            createAndAppendFocusableElement(250, 50, container, "1"),
            createAndAppendFocusableElement(50, 250, container, "2"),
            createAndAppendFocusableElement(250, 250, container, "3"),
            createAndAppendFocusableElement(450, 250, container, "4"),
            createAndAppendFocusableElement(250, 450, container, "5")
        ];
    }

    function spinWait(evaluator: () => boolean) {
        return new WinJS.Promise<void>(c => {
            var count = 0;
            var handle = setInterval(() => {
                if (++count === 100) {
                    clearInterval(handle);
                    evaluator();    // Step into this call to debug the evaluator
                    throw "test timeout";
                }
                if (evaluator()) {
                    c();
                    clearInterval(handle);
                }
            }, 50);
        });
    }

    function waitForFocus(w: Window, e: HTMLElement) {
        return spinWait(() => w.document.activeElement === e);
    }

    export class AutoFocusTests {
        rootContainer: HTMLDivElement;

        setUp() {
            document.body.appendChild(highlightStyle);
            this.rootContainer = document.createElement("div");
            this.rootContainer.style.position = "relative";
            document.body.appendChild(this.rootContainer);
            WinJS.UI.AutoFocus.focusRoot = this.rootContainer;
        }

        tearDown() {
            document.body.removeChild(highlightStyle);
            this.rootContainer.parentElement.removeChild(this.rootContainer);
            this.rootContainer = null;
            WinJS.UI.AutoFocus.focusRoot = null;
            WinJS.UI.AutoFocus.disableAutoFocus();

            // Clear event listeners
            WinJS.UI.AutoFocus["_listeners"].focuschanging = [];
            WinJS.UI.AutoFocus["_listeners"].focuschanged = [];
        }

        testFindNextFocusElement() {
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.AutoFocus.findNextFocusElement("left");
            LiveUnit.Assert.areEqual(layout[2], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("right");
            LiveUnit.Assert.areEqual(layout[4], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("up");
            LiveUnit.Assert.areEqual(layout[1], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("down");
            LiveUnit.Assert.areEqual(layout[5], target);
        }

        testFindNextFocusElementWithReferenceElement() {
            var layout = createCrossLayout(this.rootContainer);

            var target = WinJS.UI.AutoFocus.findNextFocusElement("left", { referenceElement: layout[4] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("right", { referenceElement: layout[2] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("up", { referenceElement: layout[5] });
            LiveUnit.Assert.areEqual(layout[3], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("down", { referenceElement: layout[1] });
            LiveUnit.Assert.areEqual(layout[3], target);
        }

        testFindNextFocusElementWithNoInitialFocus() {
            var layout = createCrossLayout(this.rootContainer);

            document.body.focus();
            LiveUnit.Assert.areEqual(document.body, document.activeElement);

            var target = WinJS.UI.AutoFocus.findNextFocusElement("right");
            LiveUnit.Assert.isNotNull(target);
        }

        testMoveFocus() {
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.AutoFocus.moveFocus("left");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            target = WinJS.UI.AutoFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            target = WinJS.UI.AutoFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);

            target = WinJS.UI.AutoFocus.moveFocus("down");
            LiveUnit.Assert.areEqual(document.activeElement, target);
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
        }

        testFocusRoot() {
            var left = createCrossLayout();
            var right = createCrossLayout();
            right[0].style.top = "0px";
            right[0].style.left = "700px";

            this.rootContainer.appendChild(left[0]);
            this.rootContainer.appendChild(right[0]);

            left[3].focus();
            LiveUnit.Assert.areEqual(left[3], document.activeElement);

            WinJS.UI.AutoFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(left[4], document.activeElement);

            // Moving right should NOT move out of the left container
            var target = WinJS.UI.AutoFocus.moveFocus("right", { focusRoot: left[0] });
            LiveUnit.Assert.areEqual(left[4], document.activeElement);
            LiveUnit.Assert.isNull(target);

            // Try the same as above using global focus root settings
            WinJS.UI.AutoFocus.focusRoot = left[0];
            target = WinJS.UI.AutoFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(left[4], document.activeElement);
            LiveUnit.Assert.isNull(target);

            // Focus should move across containers w/o focus root settings
            WinJS.UI.AutoFocus.focusRoot = null;
            target = WinJS.UI.AutoFocus.moveFocus("right");
            LiveUnit.Assert.areEqual(right[2], document.activeElement);
        }

        testAutoFocusHistory() {
            /**
             * ??????????????? ??????????????? 
             * ?      1      ? ?             ?
             * ??????????????? ?             ?
             * ??????????????? ?             ?
             * ?             ? ?      3      ?
             * ?      2      ? ?             ?
             * ?             ? ?             ?
             * ??????????????? ???????????????
             *
             * Normally, if focus was on 3, left would resolve to 2 since 2 occupies a bigger portion of 3's shadow.
             * However, if focus initially was on 1, then was moved right to 3, then a following left should resolve to 1.
            **/

            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(50, 50, this.rootContainer, "1", "button", 200, 100),
                createAndAppendFocusableElement(50, 200, this.rootContainer, "2", "button", 200, 300),
                createAndAppendFocusableElement(350, 50, this.rootContainer, "3", "button", 200, 450)
            ];

            // Move focus left from 3
            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.AutoFocus.moveFocus("left");
            LiveUnit.Assert.areEqual(layout[2], document.activeElement);

            // Move focus right from 1, then left and we should end up at 1 again
            layout[1].focus();
            WinJS.UI.AutoFocus._autoFocus("right");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            WinJS.UI.AutoFocus._autoFocus("left");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);
        }

        testPreventAutoFocus() {
            var eventReceived = false;
            WinJS.UI.AutoFocus.addEventListener("focuschanging", (e: WinJS.UI.AutoFocus.AutoFocusEvent) => {
                LiveUnit.Assert.areEqual(layout[1], e.detail.nextFocusElement);
                e.preventDefault();
                eventReceived = true;
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            WinJS.UI.AutoFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);
            LiveUnit.Assert.isTrue(eventReceived);
        }

        testOverrideAttribute() {
            var layout = createCrossLayout(this.rootContainer);
            for (var i = 1; i < layout.length; i++) {
                layout[i].id = "btn" + i;
            }
            layout[3].setAttribute("data-win-focus", "{ left: '#btn4', right: '#btn2', up: '#btn5', down: '#btn1' }");

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            var target = WinJS.UI.AutoFocus.findNextFocusElement("up");
            LiveUnit.Assert.areEqual(layout[5], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("down");
            LiveUnit.Assert.areEqual(layout[1], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("left");
            LiveUnit.Assert.areEqual(layout[4], target);

            target = WinJS.UI.AutoFocus.findNextFocusElement("right");
            LiveUnit.Assert.areEqual(layout[2], target);
        }

        testAutoFocusWithDisabledElements() {
            var layout = createCrossLayout(this.rootContainer);
            layout[3].disabled = true;

            layout[5].focus();
            LiveUnit.Assert.areEqual(layout[5], document.activeElement);

            WinJS.UI.AutoFocus.moveFocus("up");
            LiveUnit.Assert.areEqual(layout[1], document.activeElement);
        }

        testAutoFocusEnabled(complete) {
            function doKeydown(targetElement: HTMLElement, keyCode: number, expNextEl: HTMLElement) {
                expectedKeyCode = keyCode;
                expectedNextElement = expNextEl;
                Helper.keydown(targetElement, keyCode);
            }

            var numEventsReceived = 0;
            var expectedKeyCode = -1;
            var expectedNextElement: HTMLElement;
            WinJS.UI.AutoFocus.addEventListener("focuschanging", (e: WinJS.UI.AutoFocus.AutoFocusEvent) => {
                LiveUnit.Assert.areEqual(expectedKeyCode, e.detail.keyCode);
                LiveUnit.Assert.areEqual(expectedNextElement, e.detail.nextFocusElement);
                numEventsReceived++;
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
            setTimeout(() => {
                // Make sure AutoFocus did not move focus w/o being enabled
                LiveUnit.Assert.areEqual(layout[3], document.activeElement);

                WinJS.UI.AutoFocus.enableAutoFocus();

                doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
                waitForFocus(window, layout[1])
                    .then(() => {
                        doKeydown(layout[1], WinJS.Utilities.Key.downArrow, layout[3]);
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        doKeydown(layout[3], WinJS.Utilities.Key.leftArrow, layout[2]);
                        return waitForFocus(window, layout[2]);
                    }).then(() => {
                        doKeydown(layout[2], WinJS.Utilities.Key.rightArrow, layout[3]);
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        // Disable AutoFocus and check that subsequent keypresses don't move focus
                        WinJS.UI.AutoFocus.disableAutoFocus();
                        doKeydown(layout[3], WinJS.Utilities.Key.upArrow, layout[1]);
                        return WinJS.Promise.timeout(1000);
                    }).done(() => {
                        LiveUnit.Assert.areEqual(4, numEventsReceived);
                        complete();
                    });
            }, 1000);
        }

        testAutoFocusWithCustomKeyMappings(complete) {
            function doKeydown(targetElement: HTMLElement, keyCode: number, expNextEl: HTMLElement) {
                expectedKeyCode = keyCode;
                expectedNextElement = expNextEl;
                Helper.keydown(targetElement, keyCode);
            }

            var numEventsReceived = 0;
            var expectedKeyCode = -1;
            var expectedNextElement: HTMLElement;
            WinJS.UI.AutoFocus.addEventListener("focuschanging", (e: WinJS.UI.AutoFocus.AutoFocusEvent) => {
                LiveUnit.Assert.areEqual(expectedKeyCode, e.detail.keyCode);
                LiveUnit.Assert.areEqual(expectedNextElement, e.detail.nextFocusElement);
                numEventsReceived++;
            });

            WinJS.UI.AutoFocus.enableAutoFocus();
            WinJS.UI.AutoFocus.autoFocusMappings["up"].push(WinJS.Utilities.Key.w);
            WinJS.UI.AutoFocus.autoFocusMappings["down"].push(WinJS.Utilities.Key.s);
            WinJS.UI.AutoFocus.autoFocusMappings["left"].push(WinJS.Utilities.Key.a);
            WinJS.UI.AutoFocus.autoFocusMappings["right"].push(WinJS.Utilities.Key.d);
            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            doKeydown(layout[3], WinJS.Utilities.Key.w, layout[1]);
            waitForFocus(window, layout[1])
                .then(() => {
                    doKeydown(layout[1], WinJS.Utilities.Key.s, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).then(() => {
                    doKeydown(layout[3], WinJS.Utilities.Key.a, layout[2]);
                    return waitForFocus(window, layout[2]);
                }).then(() => {
                    doKeydown(layout[2], WinJS.Utilities.Key.d, layout[3]);
                    return waitForFocus(window, layout[3]);
                }).done(() => {
                    LiveUnit.Assert.areEqual(4, numEventsReceived);
                    complete();
                });
        }

        testFocusChangedEvent(complete) {
            WinJS.UI.AutoFocus.enableAutoFocus();
            WinJS.UI.AutoFocus.addEventListener("focuschanged", (e: WinJS.UI.AutoFocus.AutoFocusEvent) => {
                LiveUnit.Assert.areEqual(layout[3], e.detail.previousFocusElement);
                LiveUnit.Assert.areEqual(layout[1], document.activeElement);
                LiveUnit.Assert.areEqual(WinJS.Utilities.Key.upArrow, e.detail.keyCode);
                complete();
            });

            var layout = createCrossLayout(this.rootContainer);

            layout[3].focus();
            LiveUnit.Assert.areEqual(layout[3], document.activeElement);

            Helper.keydown(layout[3], WinJS.Utilities.Key.upArrow);
        }

        testAutoFocusInIFrame(complete) {
            /**
             *        1 2
             *      ???????
             *    8 ? 0 1 ? 3
             *    7 ? 2 3 ? 4
             *      ???????
             *        6 5
            **/

            var layout = [
                this.rootContainer,
                createAndAppendFocusableElement(300, 50, this.rootContainer, "1"),
                createAndAppendFocusableElement(500, 50, this.rootContainer, "2"),

                createAndAppendFocusableElement(750, 300, this.rootContainer, "3"),
                createAndAppendFocusableElement(750, 500, this.rootContainer, "4"),

                createAndAppendFocusableElement(500, 750, this.rootContainer, "5"),
                createAndAppendFocusableElement(300, 750, this.rootContainer, "6"),

                createAndAppendFocusableElement(50, 500, this.rootContainer, "7"),
                createAndAppendFocusableElement(50, 300, this.rootContainer, "8"),

            ];
            var iframeEl = <HTMLIFrameElement>createAndAppendFocusableElement(250, 250, this.rootContainer, null, "iframe", 450, 450);
            iframeEl.src = "AutoFocusPage.html";
            var iframeWin = (<HTMLIFrameElement>iframeEl).contentWindow;
            var iframeLayout: Array<HTMLButtonElement>;

            window.addEventListener("message", function ready(e: MessageEvent) {
                // The first crossframe message indicates that the iframe has loaded.
                window.removeEventListener("message", ready);
                iframeLayout = <any>iframeWin.document.querySelectorAll("button");

                layout[1].focus();
                LiveUnit.Assert.areEqual(layout[1], document.activeElement);

                WinJS.UI.AutoFocus._autoFocus("down");
                LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                waitForFocus(iframeWin, iframeLayout[0])
                    .then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("right");
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("up");
                        return waitForFocus(window, layout[2]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("down");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("right");
                        return waitForFocus(window, layout[3]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("left");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[1]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("down");
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("right");
                        return waitForFocus(window, layout[4]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("left");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("down");
                        return waitForFocus(window, layout[5]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("up");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[3]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("left");
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("down");
                        return waitForFocus(window, layout[6]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("up");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("left");
                        return waitForFocus(window, layout[7]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("right");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[2]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("up");
                        return waitForFocus(iframeWin, iframeLayout[0]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("left");
                        return waitForFocus(window, layout[8]);
                    }).then(() => {
                        WinJS.UI.AutoFocus._autoFocus("right");
                        LiveUnit.Assert.areEqual(iframeEl, document.activeElement);
                        return waitForFocus(iframeWin, iframeLayout[0]);
                    }).then(() => {
                        iframeWin["WinJS"].UI.AutoFocus._autoFocus("up");
                        return waitForFocus(window, layout[1]);
                    }).done(complete);
            });
        }
    }
}
LiveUnit.registerTestClass("WinJSTests.AutoFocusTests");
