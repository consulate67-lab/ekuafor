
import axios from 'axios';

async function testNetgsm() {
    const usercode = '8503058349';
    const password = 'your_password_here'; // Replace with actual or use dummy for structure check
    const gsmno = '5336660125';
    const message = 'Salon Cebinde Test Mesajı - UTF8 Test: şıüğçö İŞĞÜÇÖ';
    const msgheader = 'SelimYILMAZ';
    const postUrl = 'https://api.netgsm.com.tr/sms/send/get/';

    console.log('--- Testing Netgsm Parametric POST ---');
    const params = new URLSearchParams();
    params.append('usercode', usercode);
    params.append('password', 'N6.P63N9');
    params.append('gsmno', gsmno);
    params.append('message', message);
    params.append('msgheader', msgheader);
    params.append('dil', 'TR');

    try {
        const response = await axios.post(postUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
        });
        console.log('Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

testNetgsm();
