/*
  RR-DNS in Firefox and Chrome
  ============================

  RR-DNS (a domain name with multiple IPs) may be tested on Linux by adding
  this to /etc/hosts:

    # Reachable loopback address that rejects connections.
    127.1.1.1   dummy.local
    # Unreachable external address that times out.
    10.1.1.1    dummy.local
    # Reachable external address that accepts connections.
    8.8.8.8     dummy.local

  Firefox and RR-DNS:

  * When an IP rejects connection (SYN+RST) - Firefox transparently tries
    next IP without aborting the request.
  * When an IP times out (no response to SYN) - because of XHR.timeout or
    of default Firefox timeout (90 seconds) if that's unset - Firefox aborts
    the request and fires onreadystate with readyState = 2, then 4 and empty
    response. If another request is made to the same domain then Firefox will
    use next address.
  * If an IP returns an invalid response but TCP handshake succeeds - Firefox
    will stick to it from now on.
  * The timeout of individual IPs (i.e. when Firefox may repeat request
    during this session to one of the previously failed IPs) was not
    determined but it was determined that neither Clear Recent History
    nor Private Mode (!) do that, only restarting Firefox does that reliably.

  Chrome and RR-DNS:

  * When an IP times out (no response to SYN) because of default Chrome
    timeout (2-3 minutes, which cannot be changed for sync XHR) - Chrome
    transparently tries next IP without aborting the request.
  * If an IP returns an invalid response but TCP handshake succeeds -
    Chrome will stick to it from now on.
  * Chrome refreshes DNS entries very often (for every request?), including
    on extension reload (for unpacked extensions).

  Other notes:

  * Looks like it's a standard to not to shuffle the IP list, i.e. try
    returned addresses in their original order. Firefox, Chrome and curl
    all do that. That's why BDNS resolver (bdns.io) shuffles results by
    default.
  * Unlike Firefox, Chrome will periodically reload a tab which loading was
    aborted by an extension. Because of this and transparent retries on
    rejection and timeout it's not necessary to implement reloading in the
    extension.
*/

var abiCode=[
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "name_die",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "v",
				"type": "string"
			}
		],
		"name": "name_new",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "salt",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "v",
				"type": "string"
			}
		],
		"name": "name_new_with_ticket",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "v",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "name_update",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "ticket",
				"type": "uint256"
			}
		],
		"name": "ticket_die",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "salted_name_sha256hash",
				"type": "uint256"
			}
		],
		"name": "ticket_new",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "name_is_reserved",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "name_query",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "op_is_authorized",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

var contractAddress="0x68e50eba705f11f5b42e215f2dd5e1bacb7171c4";

// Update manifest when this list is changed.
var apiBaseURLs = [
  'https://bitbaba.com/eth/'
  /*
  'https://bdns.at/r/',
  'https://bdns.nu/r/'
  */
];

var apiBaseUrlIndex = Math.floor(Math.random() * apiBaseURLs.length);

var apiTimeout = 5000;

var reservedTLDs = [
// the ARPA tld
"arpa"
// the 7 gTLDs
,"com"
,"org"
,"net"
,"int"
,"edu"
,"gov"
,"mil"
// the info
,"info"
// the ccTLDs
,"ac"
,"ad"
,"ae"
,"af"
,"ag"
,"ai"
,"al"
,"am"
,"ao"
,"aq"
,"ar"
,"as"
,"at"
,"au"
,"aw"
,"ax"
,"az"
,"ba"
,"bb"
,"bd"
,"be"
,"bf"
,"bg"
,"bh"
,"bi"
,"bj"
,"bm"
,"bn"
,"bo"
,"bq"
,"br"
,"bs"
,"bt"
,"bw"
,"by"
,"bz"
,"ca"
,"cc"
,"cd"
,"cf"
,"cg"
,"ch"
,"ci"
,"ck"
,"cl"
,"cm"
,"cn"
,"co"
,"cr"
,"cu"
,"cv"
,"cw"
,"cx"
,"cy"
,"cz"
,"de"
,"dj"
,"dk"
,"dm"
,"do"
,"dz"
,"ec"
,"ee"
,"eg"
,"eh"
,"er"
,"es"
,"et"
,"eu"
,"fi"
,"fj"
,"fk"
,"fm"
,"fo"
,"fr"
,"ga"
,"gd"
,"ge"
,"gf"
,"gg"
,"gh"
,"gi"
,"gl"
,"gm"
,"gn"
,"gp"
,"gq"
,"gr"
,"gs"
,"gt"
,"gu"
,"gw"
,"gy"
,"hk"
,"hm"
,"hn"
,"hr"
,"ht"
,"hu"
,"id"
,"ie"
,"il"
,"im"
,"in"
,"io"
,"iq"
,"ir"
,"is"
,"it"
,"je"
,"jm"
,"jo"
,"jp"
,"ke"
,"kg"
,"kh"
,"ki"
,"km"
,"kn"
,"kp"
,"kr"
,"kw"
,"ky"
,"kz"
,"la"
,"lb"
,"lc"
,"li"
,"lk"
,"lr"
,"ls"
,"lt"
,"lu"
,"lv"
,"ly"
,"ma"
,"mc"
,"md"
,"me"
,"mg"
,"mh"
,"mk"
,"ml"
,"mm"
,"mn"
,"mo"
,"mp"
,"mq"
,"mr"
,"ms"
,"mt"
,"mu"
,"mv"
,"mw"
,"mx"
,"my"
,"mz"
,"na"
,"nc"
,"ne"
,"nf"
,"ng"
,"ni"
,"nl"
,"no"
,"np"
,"nr"
,"nu"
,"nz"
,"om"
,"pa"
,"pe"
,"pf"
,"pg"
,"ph"
,"pk"
,"pl"
,"pm"
,"pn"
,"pr"
,"ps"
,"pt"
,"pw"
,"py"
,"qa"
,"re"
,"ro"
,"rs"
,"ru"
,"rw"
,"sa"
,"sb"
,"sc"
,"sd"
,"se"
,"sg"
,"sh"
,"si"
,"sk"
,"sl"
,"sm"
,"sn"
,"so"
,"sr"
,"ss"
,"st"
,"su"
,"sv"
,"sx"
,"sy"
,"sz"
,"tc"
,"td"
,"tf"
,"tg"
,"th"
,"tj"
,"tk"
,"tl"
,"tm"
,"tn"
,"to"
,"tr"
,"tt"
,"tv"
,"tw"
,"tz"
,"ua"
,"ug"
,"uk"
,"us"
,"uy"
,"uz"
,"va"
,"vc"
,"ve"
,"vg"
,"vi"
,"vn"
,"vu"
,"wf"
,"ws"
,"ye"
,"yt"
,"za"
,"zm"
,"zw"];

// Additionally restricted by manifest's permissions.
var allURLs = {
  urls: [
    'http://*/*',
    'https://*/*'
  ]
};

function parseURL(url) {
  var match = (url || '').match(/^(\w+):\/\/[^\/]*?([\w.-]+)(:(\d+))?(\/|$)/);
  if (match) {
    return {
      url: url,
      scheme: match[1],
      domain: match[2],
      tld: match[2].match(/[^.]+$/),
      port: match[4]
    };
  }
}

// tld = 'bit'.
function isSupportedTLD(tld) {
  for (var i = 0; i < reservedTLDs.length; i++){
	  if (reservedTLDs[i] == tld) return false;
  }
  return true;
}

// done = function (ips), ips = [] if nx, [ip, ...] if xx, null on error.
function resolveViaWeb3(domain, async, done) {
	var apiBase = apiBaseURLs[apiBaseUrlIndex];
	console.log("BDNS: resolveViaAPI("+domain+"), by " + apiBase);
	var web3 = new Web3(new Web3.providers.HttpProvider(apiBase, {timeout: 5000}));
	var contract = new web3.eth.Contract(abiCode, contractAddress);
	contract.methods.name_query(domain).call(function(error, result)
	/*TODO: Sync operation needed!*/
	{
			console.log("BDNS: resolved, " + domain +", result: "+result);
			try{
				done(result.split(','));
			}catch(e){
				console.log("BDNS: exception: " + e);
				done();
			}
	}
	);
	console.log("BDNS: resolveViaAPI("+domain+"), return! ");
}

// done = function (ips), ips = [] if nx, [ip, ...] if xx, null on error.
function resolveViaAPI(domain, async, done) {
  var xhr = new XMLHttpRequest;
  var apiBase = apiBaseURLs[apiBaseUrlIndex];

  xhr.onreadystatechange = function () {
    console.info('BDNS: ' + domain 
					+ ': from ' + apiBase 
					+ ': readyState=' + xhr.readyState 
					+ ', status=' + xhr.status 
					+ ', response=' + xhr.responseText); //-
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
		var rpc = {};
        try{
			rpc = JSON.parse(xhr.responseText);
		}catch(e){
			console.log('BDNS: parse response error, ' + e);
		}
		var apiURL = apiBase/* + encodeURIComponent(domain)*/;
		var web3 = new Web3(new Web3.providers.HttpProvider(apiBase));
		var ipstring="";
		try{
			ipstring = web3.eth.abi.decodeParameter('string', rpc.result);
		}catch(e){
			console.log('BDNS: error of decodeABI, ' + e);
		}
		var ips = [];
		try {
			ips = ipstring.split(',');
		}catch(e){
			console.log('BDNS: error of split, ' + e);
		}
        done(ips);
      } else if (xhr.status == 404) {
        done([]);
      } else {
        xhr.onerror = null;
        done();
      }
    }
  }

  xhr.onerror = function () { done(); };

  xhr.ontimeout = function () {
    apiTimeout = Math.min(apiTimeout * 1.5, 30000);
    console.warn('BDNS: ' + domain + ': resolver has timed out, increasing timeout to ' + apiTimeout + 'ms'); //-
    // Error handled is called from onreadystatechange.
  };

  // No way to specify timeout in Chrome. I'd love to hear the sound reason
  // for not allowing timeout on sync XHR - where it's most needed.
  if (async) {
    xhr.timeout = apiTimeout;
  }

  try {
    var apiURL = apiBase/* + encodeURIComponent(domain)*/;
	var contractAddress="0x68e50eba705f11f5b42e215f2dd5e1bacb7171c4";
	var web3 = new Web3(new Web3.providers.HttpProvider(apiBase));
	var contract = new web3.eth.Contract(abiCode, contractAddress);
	var abi_encoded_data=contract.methods.name_query(domain).encodeABI();
	var rpc = {
		"jsonrpc":"2.0",
		"id":2,
		"method":"eth_call",
		"params":[
			{
				"data": abi_encoded_data,
				"to": contractAddress
			},
			"latest"
			]
	};
    xhr.open("POST", apiURL, async);
	xhr.setRequestHeader('content-type', 'application/json');
    xhr.send(JSON.stringify(rpc));
    return xhr;
  } catch (e) {
    done();
  }
}


function rotateApiHost() {
  if (++apiBaseUrlIndex >= apiBaseURLs.length) {
    apiBaseUrlIndex = 0;
  }

  console.info('BDNS: switched to API server #' + apiBaseUrlIndex + ' at ' + (new Date).toTimeString()); //-
}
