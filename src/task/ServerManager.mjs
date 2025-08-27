import express from 'express'


class ServerManager {
    static health() { console.log('ServerManager is healthy') }
}


export { ServerManager }