import * as vscode from 'vscode';
import * as gallery from './gallery';
import * as viewer from './viewer';
import * as file_watcher from './file_watcher';


export function activate(context: vscode.ExtensionContext) {
	console.log('Welcome! VS Code extension "GeriYoco: Image Gallery" is now active.');

	const viewerEditor = new viewer.ViewerCustomEditor(context);
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			viewer.ViewerCustomEditor.viewType,
			viewerEditor,
			{
				supportsMultipleEditorsPerDocument: true,
				webviewOptions: {
					retainContextWhenHidden: true,
				}
			},
		)
	);

	let dispGallery = vscode.commands.registerCommand(
		'vscodeImageGallery.openGallery',
		async (galleryFolder?: vscode.Uri) => {
			const mainPanel = await gallery.createPanel(context, galleryFolder);
			const galleryFileWatcher = file_watcher.galleryFileWatcher(mainPanel, galleryFolder);
			context.subscriptions.push(galleryFileWatcher);

			mainPanel.webview.onDidReceiveMessage(
				async message => {
					switch (message.command) {
						case 'vscodeImageGallery.openViewer':
							const resource = vscode.Uri.file(vscode.Uri.parse(message.src).path);
							await vscode.commands.executeCommand(
								'vscode.open',
								resource,
								{
									preserveFocus: true,
									preview: message.preview,
									viewColumn: vscode.ViewColumn.Two,
								},
							);
							return;
					}
				},
				undefined,
				context.subscriptions,
			);

			mainPanel.onDidDispose(
				() => {
					galleryFileWatcher.dispose();
				},
				undefined,
				context.subscriptions
			);
		}
	);
	context.subscriptions.push(dispGallery);
}

export function deactivate() { }
