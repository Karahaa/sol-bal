 let txs = []
    let isTxParsed = false
    let isClustersParsed = false
    let retry = 0
    let retryClusters = 0
    let badProtocols = ['merkly', 'zerius', 'gas.zip', 'l2telegraph', 'l2pass', 'l2marathon', 'nogem']
    let badProtocolsCount = 0

    const uniqueDays = new Set()
    const uniqueWeeks = new Set()
    const uniqueMonths = new Set()
    const uniqueContracts = new Set()
    const uniqueSource = new Set()
    const uniqueDestination = new Set()
    const sources = {}
    const destinations = {}
    const protocols = {}

    const existingData = await getWalletFromDB(wallet, 'layerzero')

    if (existingData && !isFetch) {
        data = JSON.parse(existingData)
    } else {
        while (!isTxParsed) {
            let created = {}
            if (config.modules.layerzero.fromDate) {
                created = { 
                    'lte': new Date().toISOString(),
                    'gte': new Date(`${config.modules.layerzero.fromDate}T00:00:00.000Z`).toISOString(),
                }
            }

            const input = JSON.stringify({
                filters: {
                    address: wallet,
                    stage: 'mainnet',
                    created: created
                }
            })

            await axios.get(`https://layerzeroscan.com/api/trpc/messages.list?input=${encodeURIComponent(input)}`, {
                headers: getQueryHeaders(wallet),
                httpsAgent: agent,
                signal: newAbortSignal(15000)
            }).then(response => {
                txs = response.data.result.data.messages
                data.tx_count = response.data.result.data.count
                isTxParsed = true
            }).catch(async error => {
                if (config.debug) console.error(wallet, error.toString(), '| Get random proxy')
                retry++

                agent = getProxy(index, true)
                await sleep(3000)

                if (retry >= 3) {
                    isTxParsed = true
                }
            })
        }

        while (!isClustersParsed) {
            await axios.post(`https://api.clusters.xyz/v0.1/name/addresses`, [wallet.toLowerCase()], {
                headers: getQueryHeaders(),
                httpsAgent: agent,
                signal: newAbortSignal(15000)
            }).then(response => {
                data.clusters = response.data[0].name ? response.data[0].name.replace('/main', '') : ''
                isClustersParsed = true
            }).catch(async error => {
                if (config.debug) console.error(wallet, error.toString(), '| Get random proxy')
                retryClusters++

                agent = getProxy(index, true)
                await sleep(2000)
                if (retryClusters >= 3) {
                    isClustersParsed = true
                }
            })
        }
