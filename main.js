// this is largely derived from https://github.com/Mothrakk/NRMT

const seenUsers = {};
const announcementDate = Date.UTC(2015, 5, 15); // epoch milliseconds since this date
const secondsInYear = 31557600;
const secondsInDay = 86400;
const oldRedditType = 'old';
const newDesktopType = 'new-desktop';
const newMobileLoggedInType = 'new-mobile-logged-in';
const newMobileLoggedOutType = 'new-mobile-logged-out';
const newOtherDesktopLoggedOutType = 'new-other-desktop-logged-out';
let rateLimited = false;
let rateLimitExpires = null;

function main() {
    const elements = getUserElements();
    if (elements === null) {
        console.error('Could not determine reddit type or could not find users.');
        return;
    }
    const [type, userElements] = elements;
    userElements.forEach((element) => {
        // The tagline is the containing element that contains the username and that will contain the account age.
        let tagline = null;
        // The userElement is the element that contains the username. This MUST be a direct child of the tagline.
        let userElement = null;
        // The username is the username text.
        let username = null;

        if (type === oldRedditType) {
            // old.reddit.com (desktop and mobile)
            tagline = element;
            userElement = tagline.getElementsByClassName('author')[0];
            if (!userElement) {
                return;
            }
            username = userElement.innerText;
        } else if (type === newDesktopType) {
            // new.reddit.com (desktop and direct link mobile)
            userElement = element.parentNode.parentNode;
            tagline = userElement.parentNode;
            username = element.getAttribute('href').split('/')[2];
        } else if (type === newMobileLoggedInType) {
            // "new".reddit.com (logged in mobile only)
            userElement = element;
            tagline = userElement.parentNode;
            username = userElement.getAttribute('href').split('/')[2];
        } else if (type === newMobileLoggedOutType) {
            // "new".reddit.com (logged out mobile only)
            userElement = element;
            tagline = userElement.parentNode.parentNode;
            username = userElement.getAttribute('href').split('/')[2];
        } else if (type === newOtherDesktopLoggedOutType) {
            // some other new reddit type (logged out)
            userElement = element.parentNode;
            tagline = element.parentNode.parentNode;
            username = element.getAttribute('href').split('/')[2];
        } else {
            return;
        }

        if (nodeInTagline(tagline)) {
            return;
        }
        processUser(username, userElement);
    });
}

/**
 * Returns an array with 2 items
 *  - item 1 is a string denoting the user element type
 *  - item 2 is an array of user elements
 */
function getUserElements() {
    let userElements = [];
    if ((userElements = document.getElementsByClassName('tagline')).length != 0) {
        return [oldRedditType, Array.from(userElements)];
    } else if ((userElements = document.querySelectorAll('a[data-testid="post_author_link"], a[data-testid="comment_author_link"]')).length != 0) {
        return [newDesktopType, Array.from(userElements)];
    } else if ((userElements = document.querySelectorAll('a[class^="PostHeader__author"], a[class^="CommentHeader__username"]')).length != 0) {
        return [newMobileLoggedInType, Array.from(userElements)];
    } else if ((userElements = document.querySelectorAll('a[slot="authorName"]')).length != 0) {
        return [newMobileLoggedOutType, Array.from(userElements)];
    } else if ((userElements = document.querySelectorAll('a[href^="/user/"]:not([aria-label$="avatar"])'))) {
        return [newOtherDesktopLoggedOutType, Array.from(userElements)];
    } else {
        return null;
    }
}

function processUser(username, userElement) {
    if (username === '[deleted]') {
        return;
    }
    if (username in seenUsers) {
        insertAfter(seenUsers[username].cloneNode(true), userElement);
    } else {
        fetch(`https://reddit.com/user/${username}/about.json`)
            .then((response) => {
                if (response.status === 429) {
                    rateLimited = true;
                    const rateLimitReset = response.headers.get('x-ratelimit-reset');
                    if (rateLimitReset) {
                        rateLimitExpires = new Date();
                        rateLimitExpires.setSeconds(rateLimitExpires.getSeconds() + parseInt(rateLimitReset));
                    } else {
                        rateLimitExpires = new Date();
                        rateLimitExpires.setSeconds(rateLimitExpires.getSeconds() + 600);
                    }
                } else {
                    return response.json();
                }
            })
            .then((data) => {
                const createdAt = data.data.created_utc;
                createNode(username, createdAt);
            })
            .catch((error) => {
                console.error(error);
            });
    }
}

function createNode(username, createdAt) {
    const node = document.createElement('span');
    const accountAge = getAccountAge(createdAt);
    const accountAgeString = getAccountAgeString(accountAge);
    node.appendChild(document.createTextNode(accountAgeString));
    node.setAttribute('style', 'padding: 2px; margin: 3px;');
    const createdAtInMilliseconds = createdAt * 1000;
    const now = Date.now();
    
    // Get reference date
    const daysType = 'days';
    const cutoffType = 'cutoff';
    let referenceDateType = null;
    let referenceDateValue = announcementDate;
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
        referenceDateType = results.type;
        return browser.storage.sync.get('value');
    })
    .then((results) => {
        referenceDateValue = results.value;
        if (referenceDateType === daysType) {
            referenceDateValue = new Date();
            referenceDateValue.setDate(referenceDateValue.getDate() - results.value);
        } else if (referenceDateType === cutoffType) {
            referenceDateValue = new Date(results.value);
        } else {
            referenceDateValue = new Date();
            referenceDateValue.setDate(referenceDateValue.getDate() - 365);
        }

        if (createdAtInMilliseconds >= referenceDateValue) {
            // a newly created account produces a scale close to 1, an account created on the announcement date produces a scale close to 0
            const scale = (createdAtInMilliseconds - referenceDateValue) / (now - referenceDateValue);
            // for background color red = new, white = old. 255 * 0 produces red, 255 * 1 produces white
            const backgroundScale = 1 - scale;
            const backgroundOtherColor = 255 * backgroundScale;
            // for text color white should pair with a red background and black should match with a white background
            const textColor = 255 * (1 - Math.pow(backgroundScale, 2));
            node.setAttribute('style', `color: rgb(${textColor}, ${textColor}, ${textColor}); background-color: rgb(255, ${backgroundOtherColor}, ${backgroundOtherColor}); border-radius: 5px; padding: 2px; margin: 3px;`);
        }
        node.className = "reddit_age";
        seenUsers[username] = node;
    });
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

    return `${age}`;
}

function nodeInTagline(tagline) {
    return tagline.getElementsByClassName('reddit_age').length > 0;
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

setInterval(() => {
    if (!rateLimited) {
        main();
    } else {
        if (rateLimitExpires && Date.now() > rateLimitExpires) {
            rateLimited = false;
            rateLimitExpires = null;
        }
    }
}, 1000);
