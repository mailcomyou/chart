
/**
 * класс графика
 */
class Chart {

    constructor() {
        this.os = 200;//смещение по y вниз, чтоб отобразить как отрицательные, так и положительные значения
        this.c = document.getElementById("myCanvas");
        this.ctx = this.c.getContext("2d");
    }

    /**
     * рисуем нулевую ось X
     */
    drawX() {

        this.ctx.moveTo(0,this.os);

        this.ctx.strokeStyle = "#ffe800";

        this.ctx.lineTo(this.c.width,this.os);
        this.ctx.stroke();

    }

    setDefault(){
        this.ctx.moveTo(0,this.os);

        this.ctx.strokeStyle = "black";
    }

    /**
     * рисуем график на основе данных
     * @param data
     */

    drawData(data) {
        this.ctx.clearRect(0,0,this.c.width,this.c.height);

        this.drawX();
        this.setDefault();

        let pace = this.c.width/data.length;
        let x = 0;
        for (let obj in data) {
            let avr = -data[obj].average*20 + this.os;

            this.ctx.lineTo(x,avr);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.beginPath();
            this.ctx.moveTo(x,avr);

            x+=pace;
        }



    }

}

/**
 * класс для работы с данными
 */
class DataHandler {
    constructor() {

    }

    /**
     * получение данных
     * @param objectDB
     */
    getData(objectDB) {
        DataHandler.getDataBD(objectDB);
    }

    /**
     * получение данных из БД, если таблица пустая, щлем запрос на серв за данными
     * @param objectDB
     */
    static getDataBD(objectDB){
        let active = Helpers.getActive();

        let transaction = db.transaction([objectDB], 'readonly');
        let objectStore = transaction.objectStore(objectDB);

        let countRequest = objectStore.count();
        countRequest.onsuccess = function() {

            if (countRequest.result == 0) {
                DataHandler.getDataXHR(active);
            } else {
                DataDB.getData(active);
            }
        }

    }

    static getDataXHR(active){
        fetch("/temp/" + active)
            .then(
                response => {
                    return response.json();
                }
            ).then(
            response => {
                let w = new DataWebWorker(response, active);
                w.postMessage(response);
            }
        ).catch(function(ex) {
            console.log('parsing failed', ex)
        });
    }
}

/**
 * работа с webworkerom
 */
class DataWebWorker {

    constructor(data, objectDB){
        this.worker = new Worker("/javascripts/worker.js");

        this.worker.addEventListener('message', function(e) {
            DataDB.addData(objectDB, e.data);

            DataDB.getData(objectDB);
        }, false);


    }

    postMessage(data) {
        this.worker.postMessage(data);
    }

}

/**
 * класс для работы с БД
 */
class DataDB {
    /**
     * инициализация БД
     */
    initDB() {
        let request = window.indexedDB.open("database", 1);

        /**
         * создание табоиц
         * @param event
         */
        request.onupgradeneeded = function (event) {

            db = event.target.result;

            db.createObjectStore("temperature", { keyPath: "year" });
            db.createObjectStore("precipitation", { keyPath: "year" });
        }

        request.onerror = function(event) {
            console.log("error: ");
        };

        request.onsuccess = function(event) {
            db = request.result;

            let active = Helpers.getActive();

            temps.getData(active);

        };

    }

    /**
     * проверка на существование БД
     * @param objectName
     * @returns {boolean}
     */

    static isDBExist(objectName) {

        return db.objectStoreNames.contains(objectName);
    }

    /**
     * удаляем все БД
     */

    static deleteAll() {
        indexedDB.webkitGetDatabaseNames().onsuccess = function(event) {
            Array.prototype.forEach.call(event.target.result, indexedDB.deleteDatabase.bind(indexedDB));
        }
    }

    /**
     * добавление данных в БД
     * @param objectDB
     * @param data
     */
    static addData(objectDB, data) {
        let openRequest = window.indexedDB.open("database", 1);
        openRequest.onerror = function(event) {
            console.error(event);
        };
        openRequest.onsuccess = function (event) {
            let db = openRequest.result;
            db.onerror = function(event) {
                console.error(event.target);
                window.alert("Database error: " + event.target.wePutrrorMessage || event.target.error.name || event.target.error || event.target.errorCode);
            };
            let transaction = db.transaction(objectDB, "readwrite");
            let itemStore = transaction.objectStore(objectDB);
            let i = 0;
            let len = data.length;
            putNext();

            function putNext() {

                if (i < len) {
                    itemStore.put(data[i]).onsuccess = putNext;
                    ++i;
                }
            }
        };
    }

    /**
     * получение данных из таблицы БД
     * @param objectDB
     */
    static getData(objectDB){
        let data = [];
        let openRequest = indexedDB.open("database",1);
        openRequest.onsuccess = function(e) {
            let db = e.target.result;

            let keyRangeValue = IDBKeyRange.bound(parseInt(yearBegin.value), parseInt(yearEnd.value));

            let transaction = db.transaction(objectDB, 'readonly');
            let objectStore = transaction.objectStore(objectDB);

            objectStore.openCursor(keyRangeValue).onsuccess = function (event) {

                let cursor = event.target.result;

                if (cursor) {
                    data.push(cursor.value);
                    cursor.continue();
                    chart.drawData(data);
                }
            };

            objectStore.openCursor(keyRangeValue).onerror = function (event) {
                console.error(event);
            }
        }
    }

}

/**
 * Хелперы
 * @type {{changeEvent: Helpers.changeEvent, clickEvent: Helpers.clickEvent, setActive: Helpers.setActive}}
 */
const Helpers = {
    changeEvent: function () {
        if(Helpers.dateCheck()) {
            Helpers.dateChanged();
        }
    },
    clickEvent: function () {
        if (Helpers.dateCheck()) {
            Helpers.setActive(this);
            DataHandler.getDataBD(this.value);
        }
    },
    setActive: function (el) {
        document.querySelectorAll('.parts').forEach(function(element, index) {
            element.classList.remove("active");
        });
        el.classList.add("active");
    },
    getActive: function (el) {
        return document.getElementsByClassName("parts active")[0].value;
    },
    dateCheck: function() {
        if (yearBegin.value > yearEnd.value) {
            alert("Интервал дат выставлен некорректно");
            return false;
        }
        return true;
    },
    dateChanged: function() {
        let active = this.getActive();
        temps.getData(active);
    },
    setSelects: function() {
        for (let i = 1881; i < 2007; i++) {
            let option = document.createElement('option');
            option.setAttribute("value", i);
            option.innerHTML = i;

            yearBegin.appendChild(option);

        }

        let l =  yearBegin.cloneNode(true);

        yearEnd.innerHTML = l.innerHTML;
        yearEnd.value = yearEnd.lastChild.value;
    }
}



//инициализируем график
let chart = new Chart();

let yearBegin = document.getElementById("yearbegin");
let yearEnd = document.getElementById("yearend");

//формирвем селекты
Helpers.setSelects();

//экземпляр для манипуляции с данными
let temps = new DataHandler();

//ссылка на объект БД
let db;

//инициализируем БД
const database = new DataDB();
database.initDB();

//вешаем обработчики
yearBegin.addEventListener("change", Helpers.changeEvent);

yearEnd.addEventListener("change", Helpers.changeEvent);

document.getElementById("temps").addEventListener("click", function() {
    Helpers.clickEvent.apply(this);
});

document.getElementById("prescp").addEventListener("click", function() {
    Helpers.clickEvent.apply(this);
});

document.getElementById("cleanDB").addEventListener("click", function() {
    DataDB.deleteAll();
    location.reload();
});
