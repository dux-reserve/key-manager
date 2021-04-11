const CryptoJS = require('crypto-js');

const hash256Digest = async (data, nonce = '') => {
	try {
		return await CryptoJS.SHA256(data + nonce).toString();
	} catch (error) {
		return new Error('Error on hashing data');
	}
};

const encryptDataAES = async (plainData, password) => {
	try {
		return await CryptoJS.AES.encrypt(plainData, password).toString();
	} catch (error) {
		return new Error('Error encrypting data');
	}
};

const decryptDataAES = async (encryptedData, password) => {
	try {
		return await CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedData, password));
	} catch (error) {
		return new Error('Error decrypting data');
	}
};

const createEncryptedJsonFile = async (settingsData, password, objectKey = 'encrypted_settings') => {
	try {
		const encryptedSettingsData = {
			[objectKey]: await CryptoJS.AES.encrypt(JSON.stringify(settingsData), password).toString(),
		};

		return encryptedSettingsData;
	} catch (error) {
		return new Error('Error encrypting settings file');
	}
};

const createEncryptedDuxFile = async (configData, password, customPassword = false) => {
	try {
		const encryptedConfigData = {
			encrypted_config: await CryptoJS.AES.encrypt(JSON.stringify(configData), password).toString(),
			withCustomPassword: customPassword,
		};

		return encryptedConfigData;
	} catch (error) {
		return new Error('Error encrypting config file');
	}
};

const decryptEncryptedDuxFile = async (encryptedConfigData, password) => {
	try {
		const decryptedData = await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedConfigData, password)));
		return decryptedData;
	} catch (error) {
		return new Error('Error decrypting config file');
	}
};

module.exports = {
	hash256Digest,
	encryptDataAES,
	decryptDataAES,
	createEncryptedJsonFile,
	createEncryptedDuxFile,
	decryptEncryptedDuxFile,
};
