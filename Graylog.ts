import {Subject, Observable} from 'rxjs';

let graylog = require('graylog2').graylog;

enum LogLevel {
    Emergency,
    Alert,
    Critical,
    Error,
    Warning,
    Notice,
    Info,
    Debug
}

export interface GraylogConfig {
    servers: { host: string, port: number }[];
    hostname: string;
    facility?: string;
    reportLevel?: number;
    reportConsoleLevel?: number;
}

export class Graylog {
    private static _sharedInstance: Graylog;
    private static sharedConfig: GraylogConfig;
    private graylog;
    private graylogConfig;
    private _serverError: Subject<Error> = new Subject<Error>();

    public static get sharedInstance(): Graylog {
        if (!Graylog._sharedInstance) {
            Graylog._sharedInstance = new Graylog(this.sharedConfig);
        }
        return Graylog._sharedInstance;
    }

    public static configureShared(config: GraylogConfig): void {
        Graylog.sharedConfig = config;
        if (Graylog._sharedInstance) {
            Graylog._sharedInstance.close();
            Graylog._sharedInstance = null;
        }
    }

    public get serverError(): Observable<Error> {
        return this._serverError;
    }

    public get config(): any {
        return this.graylogConfig;
    }

    private get unsentMessageCount(): number {
        return this.graylog._unsentMessages;
    }

    constructor(config: GraylogConfig) {
        this.graylogConfig = config;
        this.graylog = new graylog(this.graylogConfig);
        this.graylog.on('error', err => this._serverError.next(err));
    }

    public emergency(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Emergency);
    }

    public alert(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Alert);
    }

    public critical(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Critical);
    }

    public error(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Error);
    }

    public warning(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Warning);
    }

    public notice(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Notice);
    }

    public info(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Info);
    }

    public debug(message: string, data: any = {}): void {
        this.log(message, data, LogLevel.Debug);
    }

    public waitForCompletion(): Promise<void> {
        return new Promise<void>(resolve => {
            if (this.unsentMessageCount <= 0) {
                return resolve();
            }

            let timeout = () => {
                setTimeout(() => {
                    if (this.unsentMessageCount <= 0) {
                        return resolve();
                    } else {
                        timeout();
                    }
                }, 500);
            };

            timeout();
        });
    }

    public close(): void {
        this.graylog.close();
    }

    private log(message: string, data: any, level: LogLevel): void {
        if (this.graylogConfig.reportLevel >= level) {
            this.graylog._log(message, null, data, null, level);
        }
        if (this.graylogConfig.reportConsoleLevel >= level) {
            data = JSON.stringify(data);
            switch (level) {
                case LogLevel.Emergency:
                case LogLevel.Alert:
                case LogLevel.Critical:
                case LogLevel.Error:
                    console.error(message, data);
                    break;
                case LogLevel.Warning:
                    console.warn(message, data);
                    break;
                default:
                    console.log(message, data);
                    break;
            }
        }
    }
}
