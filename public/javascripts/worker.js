self.addEventListener('message', function(e) {

    let data = e.data;

    let globalSum = {};
    let globalSumArray = [];

    for (let i = 0, len = data.length; i < len; i++) {
        let obj = data[i];

        let dates = obj.t.split("-");

        if (!globalSum[dates[0]]) {
            globalSum[dates[0]] = {
                sum: 0,
                size: 0,
                average: 0
            };
        }


        globalSum[dates[0]].sum+= data[i].v;
        globalSum[dates[0]].year= parseInt(dates[0]);
        ++globalSum[dates[0]].size;
        globalSum[dates[0]].average = globalSum[dates[0]].sum/globalSum[dates[0]].size;


    }

    for (let l in globalSum) {
        globalSumArray.push(globalSum[l]);
    }

    self.postMessage(globalSumArray);
}, false);