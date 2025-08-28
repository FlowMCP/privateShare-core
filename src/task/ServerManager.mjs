class ServerManager {
    static health() { 
        console.log('ServerManager is healthy')
        
        return { status: true }
    }
}


export { ServerManager }