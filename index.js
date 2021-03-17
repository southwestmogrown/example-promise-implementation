class MyPromise {
    constructor(
        operationExecutor
    ) {
        this.state = "pending";

        this._successHandlers = [];
        this._errorHandlers = [];
        this._value = undefined;

        const resolve = (fullfilledValue) => this._setValue(true, fullfilledValue);
        const reject = (rejectionValue) => this._setValue(false, rejectionValue);
        operationExecutor(resolve, reject);
    }
    // Private methods (not to be used off of instances).
    _setValue(successful, value) {
        this._value = value;
        if (successful) {
            this.state = "fulfilled";
        } else {
            this.state = "rejected";
        }
        this._callRegisteredHandlers();
    }
    _callRegisteredHandlers() {
        setTimeout(() => { // All Promise handlers must be called asynchronously.
            if (this.state === "pending") throw new Error("Implementation error");

            let handlersToCall;
            if (this.state === "fulfilled") {
                handlersToCall = this._successHandlers;
            } else {
                handlersToCall = this._errorHandlers;
            }

            handlersToCall.forEach((handler) => {
                handler(this._value);
            });

            this._successHandlers = [];
            this._errorHandlers = [];
        }, 0);
    }
    _createHandler(registeredFn, nextPromiseResolve, nextPromiseReject) {
        return (v) => {
            try {
                const handlerReturn = registeredFn(v);
                if (handlerReturn instanceof MyPromise) {
                    handlerReturn.then(nextPromiseResolve);
                } else {
                    nextPromiseResolve(handlerReturn);
                }
            } catch (e) {
                nextPromiseReject(e);
            }
        };
    }
    // Public methods (to be used by consumers of promises)
    then(successHandler, errorHandler) {
        const promiseToReturn = new MyPromise((resolve, reject) => {

            const successFn = typeof successHandler === "function" ? successHandler : null;
            const errorFn = typeof errorHandler === "function" ? errorHandler : null;

            if (!successFn && !errorFn) {
                this._successHandlers.push(resolve);
            }
            if (successFn) {
                this._successHandlers.push(this._createHandler(successFn, resolve, reject));
            }
            if (errorFn) {
                this._errorHandlers.push(this._createHandler(errorFn, resolve, reject));
            }

        });
        if (this.state !== "pending") this._callRegisteredHandlers();
        return promiseToReturn;
    }
    catch(handlerFunction) {
        return this.then(null, handlerFunction);
    }
    // Static methods.
    static all(promises) {
        return new Promise((resolve, reject) => {
            const values = [];
            let resolved = 0;
            let neededResolved = promises.length;
            promises.forEach((promise, i) => {
                promise.then(function (v) {
                    values[i] = v;
                    resolved = resolved + 1;
                    if (resolved === neededResolved) {
                        resolve(values);
                    }
                }, reject);
            });
        });

    }
    static resolve(v) {  // Create a promise that immediately fulfills to given value.
        return new Promise(res => res(v));
    } 
    static reject(v) { // Create a promise that immediately rejects with given reason.
        return new Promise((res, rej) => rej(v));
    }
}

const { readFile } = require("fs");

const read = (filePath) => {
    return new MyPromise((resolve, reject) => {
        readFile(filePath, (err, contents) => {
            if (err) {
                reject(err);
            } else {
                resolve(contents)
            }
        })
    });
};

MyPromise.all(
    [read("index.js"), read("index.js").then(() => 4)]
).then(console.log)