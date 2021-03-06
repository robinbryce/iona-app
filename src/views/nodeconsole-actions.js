
export const UPDATE_METHOD = 'NODECONSOLE_UPDATE_METHOD';
export const UPDATE_PARAMS = 'NODECONSOLE_UPDATE_PARAMS';
export const UPDATE_APIKEY = 'NODECONSOLE_UPDATE_APIKEY';
export const CALL_RAW_METHOD = 'NODECONSOLE_CALL_RAW_METHOD';
export const UPDATE_PROVIDER_PATH = 'UPDATE_PROVIDER_PATH';
export const CALL_PROVIDER_METHOD = 'NODECONSOLE_CALL_PROVIDER_METHOD';

export const updateMethod = method => {
    return {
        type: UPDATE_METHOD,
        method
    };
};

export const updateParams = params => {
    return {
        type: UPDATE_PARAMS,
        params
    };
};

export const updateAPIKey = apikey => {
    return {
        type: UPDATE_APIKEY,
        apikey
    };
}

export const updateProviderPath = providerpath => {
    return {
        type: UPDATE_PROVIDER_PATH,
        chain_prefix
    };
};


export const callRawMethod = (request, response) => {
    return {
        type: CALL_RAW_METHOD,
        request: request,
        response: response
    };
};

export const callProviderMethod = (request, response) => {
    return {
        type: CALL_PROVIDER_METHOD,
        request: request,
        response: response
    };
};
