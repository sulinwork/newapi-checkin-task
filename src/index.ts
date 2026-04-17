export interface Env {
	// 在 Cloudflare Dashboard > Workers > 你的 Worker > Variables 中设置
	NEW_API_CONFIG: string; // JSON 格式的站点配置数组 用NewApiConfig对象解析
	FEI_SHU_BOT_KEY?: string; // 可选：PushPlus 推送 Token
	ENABLE_HTTP_TRIGGER?: boolean;//是否开启http触发的能力
}

interface NewApiConfig {
	name: string; // 站点名称，用于日志区分
	url: string; // 站点地址，如 https://api.example.com
	session: string; // 从浏览器 Cookie 复制的 session 值
	userId: string; // 从浏览器 LocalStorage 中 user 对象复制的 id
}

interface CheckinResponse {
	success: boolean;
	message?: string;
	data?: {
		quota?: number; // 获得的额度
		days?: number; // 连续签到天数
	};
}


export default {

	/**
	 * 暴露HTTP接口的能力
	 */
	async fetch(req, env) {
		if (env.ENABLE_HTTP_TRIGGER) {
			const result = await doCheckin(env);
			return new Response(JSON.stringify(result, null, 2), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(`不支持HTTP直接触发任务`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {
		ctx.waitUntil(doCheckin(env));
	}
} satisfies ExportedHandler<Env>;


async function doCheckin(env: Env): Promise<{ success: boolean; results: any[] }> {
	const sites: NewApiConfig[] = JSON.parse(env.NEW_API_CONFIG || '[]');
	const results = [];

	for (const site of sites) {
		try {
			console.log(`[${site.name}] 开始签到...`);

			const result = await checkinSingle(site);
			results.push({
				site: site.name,
				success: result.success,
				message: result.message,
				data: result.data
			});

			// 简单防并发，间隔 2 秒
			await sleep(2000);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error(`[${site.name}] 签到失败:`, errorMsg);
			results.push({
				site: site.name,
				success: false,
				message: errorMsg
			});
		}
	}

	// 发送通知
	await sendNotification(env, results);

	return { success: results.every(r => r.success), results };
}

async function checkinSingle(site: NewApiConfig): Promise<CheckinResponse> {
	const checkinUrl = `${site.url}/api/user/checkin`;

	const headers = {
		'Content-Type': 'application/json',
		'Cookie': `session=${site.session}`,
		'New-API-User': site.userId,
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		'Accept': 'application/json',
		'Referer': `${site.url}/`
	};

	const response = await fetch(checkinUrl, {
		method: 'POST',
		headers: headers
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('认证失败，请检查 session 和 userId 是否过期');
		}
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	return await response.json();
}

async function sendNotification(env: Env, results: any[]): Promise<void> {
	const successCount = results.filter(r => r.success).length;
	const failCount = results.length - successCount;

	// 构建通知内容
	const messageLines = [
		`📅 New API 自动签到报告`,
		`⏰ 时间: ${new Date().toLocaleString('zh-CN',{ timeZone: 'Asia/Shanghai' })}`,
		`✅ 成功: ${successCount} 个`,
		`❌ 失败: ${failCount} 个`,
		``,
		`详细结果:`,
		...results.map(r => {
			const icon = r.success ? '✅' : '❌';
			const detail = r.data?.quota ? `(+${r.data.quota} 额度)` : '';
			return `${icon} ${r.site}: ${r.message || '未知'} ${detail}`;
		})
	];

	const message = messageLines.join('\n');

	console.log(message);

	if (env.FEI_SHU_BOT_KEY) {
		try {
			await fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${env.FEI_SHU_BOT_KEY}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					{
						'msg_type': 'text',
						'content': {
							'text': message
						}
					})
			});
			console.log('推送成功');
		} catch (e) {
			console.error('推送失败:', e);
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
