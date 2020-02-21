// this is largely derived from https://github.com/Mothrakk/NRMT

const seenUsers = {};
const announcementDate = Date.UTC(2015, 5, 15); // epoch milliseconds since this date
const secondsInYear = 31557600;
const secondsInDay = 86400;

function main() {
    const taglines = document.getElementsByClassName('tagline');
    for (let i = 0; i < taglines.length; i++) {
        const tagline = taglines[i];
        if (nodeInTagline(tagline)) {
            continue;
        }
        const authorTag = tagline.getElementsByClassName('author')[0];
        if (!authorTag) {
            continue;
        }
        const username = authorTag.innerHTML;
        if (username in seenUsers) {
            insertAfter(seenUsers[username].cloneNode(true), authorTag);
        } else {
            fetch(`https://reddit.com/user/${username}/about.json`)
                .then((response) => {
                    return response.json();
                })
                .then((data) => {
                    const createdAt = data.data.created_utc;
                    createNode(username, createdAt);
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    }
}

function createNode(username, createdAt) {
    const node = document.createElement('span');
    const accountAge = getAccountAge(createdAt);
    const accountAgeString = getAccountAgeString(accountAge);
    node.appendChild(document.createTextNode(accountAgeString));
    if (createdAt * 1000 >= announcementDate) {
        node.setAttribute('style', 'color: #ffffff; background-color: #ff0000; border-radius:5px; padding:2px; margin:3px;');
    }
    node.className = "reddit_age";
    seenUsers[username] = node;
}

function getAccountAge(createdAt) {
    // createdAt is in seconds so convert to milliseconds so it works with Date
    const accountAge = Date.now() - createdAt * 1000;
    return accountAge;
}

function getAccountAgeString(accountAge) {
    let accountAgeInSeconds = accountAge / 1000;
    let age = '';
    if (accountAgeInSeconds >= secondsInYear) {
        const years = Math.floor(accountAgeInSeconds / secondsInYear);
        if (years == 1) {
            age += `${years} year `;
        } else {
            age += `${years} years `;
        }
        accountAgeInSeconds -= years * secondsInYear;
    }

    if (accountAgeInSeconds >= secondsInDay) {
        const days = Math.floor(accountAgeInSeconds / secondsInDay);
        if (days == 1) {
            age += `${days} day `;
        } else {
            age += `${days} days `
        }
    }

    if (age == '') {
        age = 'less than 1 day old';
    } else {
        age += 'old';
    }

    return age;
}

function nodeInTagline(tagline) {
    return tagline.getElementsByClassName('reddit_age').length > 0;
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

setInterval(main, 1000);
