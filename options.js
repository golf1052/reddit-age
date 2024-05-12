const daysType = 'days';
const cutoffType = 'cutoff';

let type = null;
let value = null;

browser.storage.sync.get('type')
    .then((results) => {
        if (!results.type) {
            const initialValues = {
                type: daysType,
                value: 365
            };
            results = initialValues;
            browser.storage.sync.set(initialValues);
            return results;
        } else {
            return results;
        }
    })
    .then((results) => {
        type = results.type;
        return browser.storage.sync.get('value');
    })
    .then((results) => {
        value = results.value;
        if (type === daysType) {
            const daysRadio = document.getElementById('daysRadio');
            daysRadio.checked = true;
            document.getElementById('daysInput').value = value;
        } else if (type === cutoffType) {
            const cutoffRadio = document.getElementById('cutoffRadio');
            cutoffRadio.checked = true;
            document.getElementById('cutoffInput').value = value;
        }

        document.getElementById('daysRadio').addEventListener('change', (element) => {
            if (element.target.checked) {
                type = daysType;
                value = document.getElementById('daysInput').value;
                browser.storage.sync.set({
                    type: type,
                    value: value
                });
            }
        });

        document.getElementById('cutoffRadio').addEventListener('change', (element) => {
            if (element.target.checked) {
                type = cutoffType;
                value = document.getElementById('cutoffInput').value;
                browser.storage.sync.set({
                    type: type,
                    value: value
                });
            }
        });

        document.getElementById('daysInput').addEventListener('change', (element) => {
            if (type === daysType) {
                value = element.target.value;
                browser.storage.sync.set({
                    type: type,
                    value: value
                }).then((val) => {
                    if (!val) {
                        return browser.storage.sync.get('value')
                    }
                })
                .then((val) => {
                    console.log(val);
                });
            }
        });

        document.getElementById('cutoffInput').addEventListener('change', (element) => {
            if (type === cutoffType) {
                value = element.target.value;
                browser.storage.sync.set({
                    type: type,
                    value: value
                });
            }
        });
    });
