import BigNumber from 'bignumber.js';

export const timer = ms => new Promise(response => setTimeout(response, ms));

export const satoshisToBitcoins = satoshis => {
	const originalValue = BigNumber(satoshis);
	const roundedValue = originalValue.integerValue(BigNumber.ROUND_DOWN);
	return BigNumber(roundedValue.shiftedBy(-8).toFixed(8));
};

export const bitcoinsToSatoshis = bitcoins => {
	return BigNumber(bitcoins).shiftedBy(8).integerValue(BigNumber.ROUND_DOWN);
};

export const isAudioPlaying = audio => {
	return !audio.paused;
};

export const capitalize = string => {
	if (typeof string !== 'string' || !string) return string;
	return string.charAt(0).toUpperCase() + string.slice(1);
};

export const isObjectEmpty = object => {
	if (object === undefined || object === null) return true;
	return Object.entries(object).length == 0;
};

export const handleFiatSymbols = (currency = 'USD') => {
	// Australian Dollar - AUD $, Canadian Dollar - CAD $, US Dollar - USD $, Euro - EUR €, British Pound Sterling - GBP ₤, Japanese Yen - JPY ¥
	// Silver Troy Ounce - XAG, Gold Troy Ounce - XAU
	currency = currency.toLowerCase();
	if (currency === 'usd' || currency === 'aud' || currency === 'cad') {
		return '$';
	} else if (currency === 'eur') {
		return '€';
	} else if (currency === 'gbp') {
		return '₤';
	} else if (currency === 'jpy') {
		return '¥';
	} else {
		return '';
	}
};

export const toFixedNoRounding = (amount, fixed) => {
	try {
		const reg = new RegExp('^-?\\d+(?:.\\d{0,' + (fixed || -1) + '})?');
		return parseFloat(amount.toString().match(reg)[0]);
	} catch (error) {
		return 0;
	}
};

export const formatNumberByThousands = (amount, isFiat = false, currency = 'USD', positiveSign = false, decimalCount = 2, showSign = true, decimal = '.', thousands = ',') => {
	try {
		if (isNaN(amount)) {
			return 0;
		} else {
			amount = isFiat ? toFixedNoRounding(amount, decimalCount) : amount;
			decimalCount = isNaN(decimalCount) ? 2 : Math.abs(decimalCount);

			const sign = amount < 0 ? '-' : positiveSign ? '+' : '';

			const i = parseInt((amount = Math.abs(Number(amount) || 0).toFixed(decimalCount))).toString();
			const j = i.length > 3 ? i.length % 3 : 0;

			return `${showSign ? sign : ''}${isFiat ? handleFiatSymbols(currency) : ''}${j ? i.substr(0, j) + thousands : ''}${i
				.substr(j)
				.replace(/(\d{3})(?=\d)/g, '$1' + thousands)}${decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : ''}`;
		}
	} catch (error) {
		return 0;
	}
};

export const labelAmountValue = (amount, isFiat = false, currency = 'USD', decimalCount = 2, labels = { trillion: 'trillion', billion: 'billion', million: 'million' }) => {
	try {
		if (Math.abs(Number(amount)) >= 1.0e12) {
			const value = Math.abs(Number(amount)) / 1.0e12;

			return `${isFiat ? handleFiatSymbols(currency) : ''}${toFixedNoRounding(value, decimalCount)} ${labels.trillion}`;
		} else if (Math.abs(Number(amount)) >= 1.0e9) {
			const value = Math.abs(Number(amount)) / 1.0e9;

			return `${isFiat ? handleFiatSymbols(currency) : ''}${toFixedNoRounding(value, decimalCount)} ${labels.billion}`;
		} else if (Math.abs(Number(amount)) >= 1.0e6) {
			const value = Math.abs(Number(amount)) / 1.0e6;

			return `${isFiat ? handleFiatSymbols(currency) : ''}${toFixedNoRounding(value, decimalCount)} ${labels.million}`;
		} else {
			return formatNumberByThousands(amount, isFiat, currency, false, decimalCount);
		}
	} catch (error) {
		return '';
	}
};

export const numberEnglishOrdinalSuffix = number => {
	const i = number % 10;
	const j = number % 100;
	if (i == 1 && j != 11) {
		return number + 'st';
	}
	if (i == 2 && j != 12) {
		return number + 'nd';
	}
	if (i == 3 && j != 13) {
		return number + 'rd';
	}
	return number + 'th';
};

export const numberToOrdinalEnglishLabel = number => {
	if (number === 1) {
		return 'first';
	} else if (number === 2) {
		return 'second';
	} else if (number === 3) {
		return 'third';
	} else if (number === 4) {
		return 'fourth';
	} else if (number === 5) {
		return 'fifth';
	} else if (number === 6) {
		return 'sixth';
	} else if (number === 7) {
		return 'seventh';
	} else if (number === 8) {
		return 'eighth';
	} else if (number === 9) {
		return 'ninth';
	} else if (number === 10) {
		return 'tenth';
	} else if (number === 11) {
		return 'eleventh';
	} else if (number === 12) {
		return 'twelfth';
	} else if (number === 13) {
		return 'thirteenth';
	} else if (number === 14) {
		return 'fourteenth';
	} else if (number === 15) {
		return 'fifteenth';
	} else if (number === 16) {
		return 'sixteenth';
	} else if (number === 17) {
		return 'seventeenth';
	} else if (number === 18) {
		return 'eighteenth';
	} else if (number === 19) {
		return 'nineteenth';
	} else if (number === 20) {
		return 'twentieth';
	} else {
		return number;
	}
};

export const numberToOrdinalFrenchLabel = (number, isFeminine = false) => {
	if (number === 1) {
		return isFeminine ? 'première' : 'premier';
	} else if (number === 2) {
		return 'deuxième';
	} else if (number === 3) {
		return 'troisième';
	} else if (number === 4) {
		return 'quatrième';
	} else if (number === 5) {
		return 'cinquième';
	} else if (number === 6) {
		return 'sixième';
	} else if (number === 7) {
		return 'septième';
	} else if (number === 8) {
		return 'huitième';
	} else if (number === 9) {
		return 'neuvième';
	} else if (number === 10) {
		return 'dixième';
	} else if (number === 11) {
		return 'onzième';
	} else if (number === 12) {
		return 'douzième';
	} else if (number === 13) {
		return 'treizième';
	} else if (number === 14) {
		return 'quatorzième';
	} else if (number === 15) {
		return 'quinzième';
	} else if (number === 16) {
		return 'seizième';
	} else if (number === 17) {
		return 'dix-septième';
	} else if (number === 18) {
		return 'dix-huitième';
	} else if (number === 19) {
		return 'dix-neuvième';
	} else if (number === 20) {
		return 'vingtième';
	} else {
		return number;
	}
};
