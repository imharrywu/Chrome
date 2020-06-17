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

// Update manifest when this list is changed.
var apiBaseURLs = [
  'https://bdns.at/r/',
  'https://bdns.nu/r/'
];

var apiBaseUrlIndex = Math.floor(Math.random() * apiBaseURLs.length);

var apiTimeout = 5000;

// Additionally restricted by manifest's permissions.
var allURLs = {
  urls: [
    //'<all_urls>',
    // *:// only matches http(s).
    // ws(s):// - Chrome 58+, not supported by Firefox yet.
    // ws(s):// removed because they upset AMO review staff and Google's
    // uploader when present in manifest.json.
    // Namecoin
    "*://*.bit/*",    "ftp://*.bit/*",
    "*://*.company/*",    "ftp://*.company/*",
    // Emercoin
    "*://*.lib/*",    "ftp://*.lib/*",
    "*://*.emc/*",    "ftp://*.emc/*",
    "*://*.bazar/*",  "ftp://*.bazar/*",
    "*://*.coin/*",   "ftp://*.coin/*",
    // OpenNIC - https://wiki.opennic.org/opennic/dot
    "*://*.bbs/*",    "ftp://*.bbs/*",
    "*://*.chan/*",   "ftp://*.chan/*",
    "*://*.cyb/*",    "ftp://*.cyb/*",
    "*://*.dyn/*",    "ftp://*.dyn/*",
    "*://*.geek/*",   "ftp://*.geek/*",
    "*://*.gopher/*", "ftp://*.gopher/*",
    "*://*.indy/*",   "ftp://*.indy/*",
    "*://*.libre/*",  "ftp://*.libre/*",
    "*://*.neo/*",    "ftp://*.neo/*",
    "*://*.null/*",   "ftp://*.null/*",
    "*://*.o/*",      "ftp://*.o/*",
    "*://*.oss/*",    "ftp://*.oss/*",
    "*://*.oz/*",     "ftp://*.oz/*",
    "*://*.parody/*", "ftp://*.parody/*",
    "*://*.pirate/*", "ftp://*.pirate/*",
    "*://*.ku/*",     "ftp://*.ku/*",
    "*://*.te/*",     "ftp://*.te/*",
    "*://*.ti/*",     "ftp://*.ti/*",
    "*://*.uu/*",     "ftp://*.uu/*",
    "*://*.fur/*",    "ftp://*.fur/*",
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
  return allURLs.urls.indexOf('*://*.' + tld + '/*') != -1;
}

// done = function (ips), ips = [] if nx, [ip, ...] if xx, null on error.
function resolveViaAPI(domain, async, done) {
  var apiBase = apiBaseURLs[apiBaseUrlIndex];
  
  console.log("BDNS: resolveViaAPI("+domain+")");

  if (true){
  	var contractAddress="0x68e50eba705f11f5b42e215f2dd5e1bacb7171c4";
	var web3 = new Web3("https://bitbaba.com/eth/");
	var contract = new web3.eth.Contract(abiCode, contractAddress);
	contract.methods.name_query(domain).call({}).then( /*TODO: Sync operation needed!*/
		function(result){
			console.log("BDNS: resolved, " + domain +", result: "+result);
			try{
				done(result.split(','));
			}catch(e){
				console.log("BDNS: exception: " + e);
				done([]);
			}
	});
  }
}

function rotateApiHost() {
  if (++apiBaseUrlIndex >= apiBaseURLs.length) {
    apiBaseUrlIndex = 0;
  }

  console.info('BDNS: switched to API server #' + apiBaseUrlIndex + ' at ' + (new Date).toTimeString()); //-
}
