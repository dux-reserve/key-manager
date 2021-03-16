const axios = require('axios');
const { blockExplorerAPIURL } = require('unchained-bitcoin');
const { getBitcoinNetworkType } = require('./index');
const { psbtFromBase64 } = require('./psbt');

const getCurrentBitcoinPrices = async () => {
	const url = 'https://api.coingecko.com/api/v3/exchange_rates';
	try {
		const response = await axios.get(url);
		return response.data;
	} catch (error) {
		return error;
	}
};

const getHistoricalBitcoinPrice = async (currency, days) => {
	const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
	try {
		const response = await axios.get(url, {
			params: {
				vs_currency: currency,
				days: days,
			},
		});
		return response.data;
	} catch (error) {
		return error;
	}
};

const getBitcoinMarketData = async currency => {
	const url = 'https://api.coingecko.com/api/v3/coins/markets';
	try {
		const response = await axios.get(url, {
			params: {
				vs_currency: currency,
				ids: 'bitcoin',
			},
		});
		return response.data[0];
	} catch (error) {
		return error;
	}
};

const getNetworkBlockHeight = async currentBitcoinNetwork => {
	try {
		const response = await axios.get(blockExplorerAPIURL(`/blocks/tip/height`, getBitcoinNetworkType(currentBitcoinNetwork)));
		return Number(response.data);
	} catch (error) {
		return error;
	}
};

const getCurrentBitcoinFeesEstimationFromMempoolSpace = async () => {
	try {
		const response = await axios.get('https://mempool.space/api/v1/fees/recommended');
		return response.data;
	} catch (error) {
		return error;
	}
};

// ? TODO: use both earn.com & mempool.space to average the fee cost... maybe
const getCurrentBitcoinFeesEstimationFromEarnBitcoinFees = async () => {
	try {
		const response = await axios.get('https://bitcoinfees.earn.com/api/v1/fees/recommended');
		return response.data;
	} catch (error) {
		return error;
	}
};

const getTransactionHex = async (txid, currentBitcoinNetwork) => {
	try {
		const response = await axios.get(blockExplorerAPIURL(`/tx/${txid}/hex`, getBitcoinNetworkType(currentBitcoinNetwork)));
		return response.data;
	} catch (error) {
		return error;
	}
};

const broadcastTransactionPsbt = async (psbt, currentBitcoinNetwork) => {
	try {
		const broadcastPsbt = psbtFromBase64(psbt);
		const txBody = broadcastPsbt.extractTransaction().toHex();
		const { data } = await axios.post(blockExplorerAPIURL('/tx', getBitcoinNetworkType(currentBitcoinNetwork)), txBody);

		return data;
	} catch (error) {
		if (error.response) {
			return error.response.data;
		} else {
			return error.message;
		}
	}
};

module.exports = {
	getCurrentBitcoinPrices,
	getHistoricalBitcoinPrice,
	getBitcoinMarketData,
	getNetworkBlockHeight,
	getCurrentBitcoinFeesEstimationFromMempoolSpace,
	getCurrentBitcoinFeesEstimationFromEarnBitcoinFees,
	getTransactionHex,
	broadcastTransactionPsbt,
};
