// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import _MenuCommandBase = require("../Menu/_Command");

export class _MenuCommand extends _MenuCommandBase.MenuCommand {
    private _beforeOnClick: Function;
    private _isAttachedMode: boolean;

    constructor(isAttachedMode: boolean, element?: HTMLElement, options?: any) {
        if (options && options.beforeOnClick) {
            this._beforeOnClick = options.beforeOnClick;
        }
        this._isAttachedMode = isAttachedMode;
        super(element, options);
    }

    _handleClick(event: any) {
        this._beforeOnClick && this._beforeOnClick(event);
        super._handleClick(event);
    }
}
