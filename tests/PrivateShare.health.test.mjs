import { PrivateShare } from '../src/index.mjs'

describe( 'PrivateShare', () => {
    describe( 'health', () => {
        test( 'returns status true', () => {
            const { status } = PrivateShare.health()
            
            expect( status ).toBe( true )
        } )
    } )
} )