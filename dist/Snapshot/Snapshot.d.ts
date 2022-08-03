export declare function Snapshot(seneca: any): {
    generateJson: (folder?: string) => Promise<{
        message: string;
        filename: string;
    }>;
    generateHtml: (folder?: string) => Promise<{
        message: string;
        filename: string;
    }>;
};
