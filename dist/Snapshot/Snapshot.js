"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Snapshot = void 0;
const fs_1 = require("fs");
const util_1 = require("util");
const mkDirAsync = (0, util_1.promisify)(fs_1.mkdir);
const writeFileAsync = (0, util_1.promisify)(fs_1.writeFile);
const readFileAsync = (0, util_1.promisify)(fs_1.readFile);
function Snapshot(seneca) {
    const data = seneca.shared.flameGraphStore.get();
    const generateJson = async (folder) => {
        const now = Date.now();
        const folderPath = folder !== null && folder !== void 0 ? folder : `./snapshots/${now}`;
        if (!(0, fs_1.existsSync)(folderPath)) {
            await mkDirAsync(folderPath, { recursive: true });
        }
        const jsonFile = `${folderPath}/${now}-snapshot.json`;
        await writeFileAsync(jsonFile, JSON.stringify(data), { encoding: 'utf-8' });
        return { message: `File ${jsonFile} was successfully written`, filename: jsonFile };
    };
    const generateHtml = async (folder) => {
        const now = Date.now();
        const folderPath = folder !== null && folder !== void 0 ? folder : `./snapshots/${now}`;
        const { filename } = await generateJson(folderPath);
        let baseHtml = (await readFileAsync(`${__dirname}/html/base.html`)).toString();
        const replaces = [
            {
                pattern: '$JSON_FILE',
                to: filename,
            }
        ];
        for (const { pattern, to } of replaces) {
            baseHtml = baseHtml.replace(pattern, to);
        }
        const htmlFile = `${folderPath}/index.html`;
        await writeFileAsync(htmlFile, baseHtml, { encoding: 'utf-8' });
        return { message: `File ${htmlFile} was successfully written`, filename: htmlFile };
    };
    return { generateJson, generateHtml };
}
exports.Snapshot = Snapshot;
//# sourceMappingURL=Snapshot.js.map