/**
 * Simple Proxy Check - Tests proxy connection
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

async function checkProxy() {
    const proxyUrl = 'http://abdul123-zone-resi:rehmanwallah123@79d78e2b508d3771.ika.na.pyproxy.io:16666';
    
    console.log('🔍 Testing proxy connection...');
    console.log('Proxy URL:', proxyUrl);
    
    try {
        const agent = new HttpsProxyAgent(proxyUrl);
        
        const response = await fetch('https://httpbin.org/ip', {
            agent: agent,
            timeout: 10000
        });
        
        const data = await response.json();
        console.log('✅ Proxy working!');
        console.log('Your IP through proxy:', data.origin);
        
        // Test Instagram connectivity
        console.log('\n🔗 Testing Instagram through proxy...');
        const igResponse = await fetch('https://www.instagram.com/', {
            agent: agent,
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log('Instagram response status:', igResponse.status);
        if (igResponse.status === 200) {
            console.log('✅ Instagram accessible through proxy');
        } else {
            console.log('⚠️ Instagram returned non-200 status');
        }
        
    } catch (error) {
        console.error('❌ Proxy test failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Proxy server refused connection');
        } else if (error.message.includes('407')) {
            console.log('💡 Proxy authentication failed');
        } else if (error.message.includes('timeout')) {
            console.log('💡 Proxy connection timed out');
        }
    }
}

checkProxy().catch(console.error);