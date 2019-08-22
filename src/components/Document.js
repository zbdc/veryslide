import domtoimage from 'dom-to-image';

import State from 'core/State.js';
import List from 'core/List';
import BaseObject from './objects/BaseObject';
import TextBox from './objects/TextBox';
import ImageBox from './objects/ImageBox';
import ImageList from './objects/ImageList';

class Page extends BaseObject {
  constructor(state) {
    super({
      type: 'Page',
      className: 'vs-page',
      objects: new List(),
      thumbnail: '',
      ...state,
    });

    this.invalidate = false;
    this.thumbnailScale = 0.2;
    this.pagethumb = null;
  }

  addObject(type, states) {
    let object = null;
    switch(type) {
      case 'TextBox':
        object = new TextBox();
        break;
      case 'ImageBox':
        object = new ImageBox();
        break;
      case 'ImageList':
        object = new ImageList();
        break;
    }
    object.page = this;
    // set default states
    if (states != null) {
      for (const [k, v] of Object.entries(states)) {
        object[k] = v;
      }
    }
    this.objects.append(object);
    this.node.append(object.node);
    this.invalidate = true;
    return object;
  }

  appendObject(object) {
    object.page = this;
    this.objects.append(object);
    this.node.append(object.node);
    this.invalidate = true;
  }

  findObject(x, y) {
    let found = null;
    this.objects.iter((object) => {
      if (object.contain(x, y) === true) {
        found = object;
      }
    });
    return found;
  }

  updateThumbnail(force) {
    if (this.node == null) return;

    // check invalidation and force update
    if (this.invalidate != true && force != true) return;
    this.invalidate = false;

    domtoimage.toJpeg(this.node.parentElement, {
      imagePlaceholder: '/static/icons/notfound.svg',
      quality: 0.5,
      width: parseInt(this.width * this.thumbnailScale),
      height: parseInt(this.height * this.thumbnailScale),
      style: {
        'transform': 'scale(' + this.thumbnailScale + ')',
        'transform-origin': 'top left',
        'background-color': this.color,
      },
    })
      .then((dataUrl) => {
        this.thumbnail = dataUrl;
        if (this.pagethumb != null) {
          this.pagethumb.updateThumbnail();
        }
      }).catch((error) => {
        console.log('Error on while creating thumbnail:', error);
      });
  }

  removeObject(object) {
    object.node.parentNode.removeChild(object.node);
    this.objects.remove(object);
    this.invalidate = true;
  }

  reorder() {
    let order = 0;
    this.objects.iter((object) => {
      object.node.style.zIndex = order;
      order += 1;
    });
    this.invalidate = true;
  }

  render() {
    let node = super.render();
    this.objects.iter((object) => {
      node.append(object.render());
    });
    return node;
  }
}

class Asset extends State {
  constructor(state) {
    super({
      type: 'Asset',
      name: '',
      path: '',
      assetType: '',
      url: '',
      ...state,
    });

    this.node = null;
    this.data = '';
  }

  update() {
    if (this.assetType !== 'URL') {
      const options = {
        method: 'GET',
        headers: {},
      }
      fetch(this.url, options).then((response) => {
        if (response.ok) {
          response.text().then((text) => {
            this.data = text;
            console.log(this.name, this.data.length);
            if (this.node != null) {
              this.node.loading(false);
            }
          });
        }
      });
    }
  }
}

class Document extends State {
  constructor(state) {
    super({
      info: null,
      width: 1024,
      height: 768,
      pages: new List(),
      assets: new List(),
      type: 'Document',
      selectedPageIndex: -1,
      ...state,
    });

    if (info != null) {
      if (info.width != null) this.width = info.width;
      if (info.height != null) this.height = info.height;
    }
    this.addIgnoreState('info');
  }

  addPage(after) {
    let page = new Page();
    page.width = this.width;
    page.height = this.height;

    if (after == null) {
      this.pages.append(page);
    } else {
      this.pages.insert(page, this.pages.find(after) + 1);
    }

    return page;
  }

  appendPage(page) {
    this.pages.append(page);
  }

  removePage(page) {
    let nextpage = this.pages.remove(page);
    return nextpage;
  }

  addAsset() {
    let asset = new Asset();
    this.assets.append(asset);
    return asset;
  }

  appendAsset(asset) {
    this.assets.append(asset);
  }

  removeAsset(asset) {
    let nextasset = this.assets.remove(asset);
    return nextasset;
  }

  deserialize(data) {
    super.deserialize(data);

    // for legacy document
    if (this.selectedPageIndex == -1 && this.pages.length > 0) {
      this.selectedPageIndex = 0;
    }
  }
}

export { Document as default, Asset, Page }