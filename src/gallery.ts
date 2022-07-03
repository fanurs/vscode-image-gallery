import * as vscode from 'vscode';
import * as utils from './utils';

export async function createPanel(context: vscode.ExtensionContext, galleryFolder?: vscode.Uri) {
    vscode.commands.executeCommand('setContext', 'ext.viewType', 'gryc.gallery');
    const panel = vscode.window.createWebviewPanel(
        'gryc.gallery',
        `Image Gallery${galleryFolder ? ': ' + utils.getFilename(galleryFolder.path) : ''}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    const imgPaths = await getImagePaths(galleryFolder);
    let pathsBySubFolders = await utils.getPathsBySubFolders(imgPaths);
    // pathsBySubFolders = sortPathsBySubFolders(pathsBySubFolders);

    panel.webview.html = getWebviewContent(context, panel.webview, pathsBySubFolders);

    return panel;
}

async function getImagePaths(galleryFolder?: vscode.Uri) {
    const globPattern = utils.getGlob();
    const files = await vscode.workspace.findFiles(
        galleryFolder ? new vscode.RelativePattern(galleryFolder, globPattern) : globPattern
    );
    return files;
}

// function sortPathsBySubFolders(pathsBySubFolders: { [key: string]: Array<vscode.Uri> }): { [key: string]: Array<vscode.Uri> } {
//     const config = vscode.workspace.getConfiguration('sorting.byPathOptions');
//     const keys = [
//         'localeMatcher',
//         'sensitivity',
//         'ignorePunctuation',
//         'numeric',
//         'caseFirst',
//         'collation',
//     ];
//     const comparator = (a: string, b: string) => {
//         return a.localeCompare(
//             b,
//             undefined,
//             Object.fromEntries(keys.map(key => [key, config.get(key)]))
//         );
//     };

//     const sortedResult: { [key: string]: Array<vscode.Uri> } = {};
//     Object.keys(pathsBySubFolders).sort(comparator).forEach(
//         subfolder => {
//             sortedResult[subfolder] = pathsBySubFolders[subfolder].sort(
//                 (path1: vscode.Uri, path2: vscode.Uri) => comparator(path1.path, path2.path)
//             );
//         }
//     );

//     return sortedResult;
// }

function getWebviewContent(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
    pathsBySubFolders: { [key: string]: Array<{ "imgUri": vscode.Uri, "imgMetadata": vscode.FileStat }> },
) {
    const placeholderUrl = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'placeholder.jpg'));
    const imgHtml = Object.keys(pathsBySubFolders).map(
        (folder, index) => {
            return `
            <button id="${folder}" class="folder">
                <div id="${folder}-arrow" class="folder-arrow">⮟</div>
                <div id="${folder}-title" class="folder-title">${folder}</div>
                <div id="${folder}-items-count" class="folder-items-count">${pathsBySubFolders[folder].length} images found</div>
            </button>
            <div id="${folder}-grid" class="grid grid-${index}">
                ${pathsBySubFolders[folder].map(img => {
                return `
                    <div class="image-container tooltip">
                        <span id="${img.imgUri.path}-tooltip" class="tooltiptext"></span>
                        <img id="${img.imgUri.path}" src="${placeholderUrl}" data-src="${webview.asWebviewUri(img.imgUri)}" data-meta='${JSON.stringify(img.imgMetadata)}' class="image lazy">
                        <div id="${img.imgUri.path}-filename" class="filename">${utils.getFilename(img.imgUri.path)}</div>
                    </div>
                    `;
            }).join('')}
            </div>
            `;
        }
    ).join('\n');

    const styleHref = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gallery.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gallery.js'));
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

    return (
        `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${utils.nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; style-src ${webview.cspSource};">
			<link href="${styleHref}" rel="stylesheet" />
			<link href="${codiconsUri}" rel="stylesheet" />
			<title>Image Gallery</title>
		</head>
		<body>
            <div class="toolbar">
                ${Object.keys(pathsBySubFolders).length > 1 ?
            '<button class="codicon codicon-expand-all"></button>' :
            '<button class="codicon codicon-collapse-all"></button>'
        }
                <div class="folder-count">${Object.keys(pathsBySubFolders).length} folders found</div>
            </div>
            ${Object.keys(pathsBySubFolders).length === 0 ? '<p>No image found in this folder.</p>' : `${imgHtml}`}
			<script nonce="${utils.nonce}" src="${scriptUri}"></script>
		</body>
		</html>`
    );
}

export function getMessageListener(message: any) {
    switch (message.command) {
        case 'vscodeImageGallery.openViewer':
            vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.file(vscode.Uri.parse(message.src).path),
                {
                    preserveFocus: false,
                    preview: message.preview,
                    viewColumn: vscode.ViewColumn.Two,
                },
            );
            break;
    }
}