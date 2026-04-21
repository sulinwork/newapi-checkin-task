interface GetQrCodeRes {
	'qrcode': string,
	'qrcode_img_content': string
}

interface ScanQRCodeRes {
	status: string,
	bot_token: string,
	ilink_bot_id: string,
	baseurl: string,
	ilink_user_id: string
}

fetch('https://ilinkai.weixin.qq.com/ilink/bot/get_bot_qrcode?bot_type=3', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'AuthorizationType': 'ilink_bot_token',
		'X-WECHAT-UIN': btoa(String(Math.floor(Math.random() * 4294967295)))

	}
})
	.then(res => res.json() as Promise<GetQrCodeRes>)
	.then(({ qrcode, qrcode_img_content }) => {
		console.log('请打开链接扫码登录:' + qrcode_img_content);
		pollScanQrCodeRes(qrcode, 3, 1000, (res) => res.status === 'confirmed')
			.then((res) => {
				console.log('扫码登录成功');
				console.log(res);
			})
			.catch(err => {
				console.log('扫码登录失败', err);
			});
	})
	.catch(err => console.log(err));


async function getScanQrCodeRes(qrcode: string) {
	return fetch(`https://ilinkai.weixin.qq.com/ilink/bot/get_qrcode_status?qrcode=${qrcode}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'AuthorizationType': 'ilink_bot_token',
			'X-WECHAT-UIN': btoa(String(Math.floor(Math.random() * 4294967295)))

		}
	}).then(res => res.json() as Promise<ScanQRCodeRes>);
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 轮询查询二维码扫描状态
 * @param qrcode 二维码字符串
 * @param maxRetries 最大重试次数，默认5次
 * @param intervalMs 每次轮询间隔（毫秒），默认2000ms
 * @param isExpectedResult 判断是否为期望结果的函数
 * @returns Promise<ScanQRCodeRes>
 */
async function pollScanQrCodeRes(
	qrcode: string,
	maxRetries: number = 5,
	intervalMs: number = 2000,
	isExpectedResult?: (res: ScanQRCodeRes) => boolean): Promise<ScanQRCodeRes> {

	// 默认期望结果判断：status 为 'success' 或 'scanned'
	const checkResult = isExpectedResult || ((res: ScanQRCodeRes) => {
		return res.status === 'success' || res.status === 'scanned';
	});

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		console.log('========');
		try {
			console.log('开始请求');
			const result = await getScanQrCodeRes(qrcode);
			console.log('结束请求', result);
			// 如果返回期望结果，立即返回
			if (checkResult(result)) {
				return result;
			}

			// 不是期望结果且还有剩余次数，等待后继续轮询
			if (attempt < maxRetries) {
				console.log('开始睡眠');
				await sleep(intervalMs);
				console.log('结束睡眠');
			}

		} catch (error) {
			// 请求异常，如果不是最后一次则继续轮询
			if (attempt < maxRetries) {
				await sleep(intervalMs);
			} else {
				throw new Error(`轮询失败，已达最大重试次数(${maxRetries})，最后异常: ${error}`);
			}
		}
	}

	// 达到最大次数仍未获得期望结果
	throw new Error(`轮询结束，${maxRetries}次查询后仍未返回期望结果`);
}






