const vscode = require('vscode');
const { detectCompleteWidget } = require('../utils');
const { getEnabledWidgets } = require('./widget-registry');

/**
 * Shows a menu with all available wrapping options
 */
async function showWidgetsMenu() {
    // Get only enabled wrappers - important to call this fresh each time
    const enabledWrappers = getEnabledWidgets();

    if (enabledWrappers.length === 0) {
        vscode.window.showWarningMessage(
            'No wrappers are currently enabled. Please enable wrappers in the Flutter Wrappers panel.'
        );
        return;
    }

    const items = enabledWrappers.map(wrapper => ({
        label: wrapper.title,
        description: `Wrap with ${wrapper.title}`,
        wrapper: wrapper
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a widget to wrap with',
    });

    if (selected) {
        // Execute the selected command
        await vscode.commands.executeCommand(selected.wrapper.id);
    }
}

/**
 * Main function to wrap a widget
 * @param {Function} snippetGenerator Function that generates the snippet with the wrapped widget
 * @param {string} widgetName Name of the widget for messages
 */
function wrapWidget(snippetGenerator, widgetName) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    let widgetText;
    let widgetRange;

    // If there's text selected, use that selection with validation
    if (!selection.isEmpty) {
        widgetRange = selection;
        widgetText = editor.document.getText(widgetRange);

        // Validate the selected text looks like a widget
        if (!widgetText.trim().startsWith(RegExp(/[A-Z]/))) {
            vscode.window.showErrorMessage('The selected text does not appear to be a Flutter widget. Widgets typically start with an uppercase letter.');
            return;
        }
    } else {
        // If there's only a cursor, try to detect the complete widget
        const position = selection.active;
        const result = detectCompleteWidget(editor.document, position);

        if (!result) {
            vscode.window.showErrorMessage('Could not detect a valid Flutter widget at cursor position. Please position your cursor on a widget like Container, Text, etc.');
            return;
        }

        widgetRange = result.range;
        widgetText = result.text;
    }

    // Insert the wrapped widget
    const wrappedWidget = snippetGenerator(widgetText);

    // Replace the original text with the wrapped widget
    editor.edit(editBuilder => {
        editBuilder.replace(widgetRange, wrappedWidget);
    }).then(success => {
        if (success) {
            vscode.window.showInformationMessage(widgetName);
            // Try to format the document after wrapping
            vscode.commands.executeCommand('editor.action.formatDocument');
        } else {
            vscode.window.showErrorMessage('Could not wrap the widget');
        }
    });
}

module.exports = {
    showWidgetsMenu,
    wrapWidget
};
