import tag from 'html-tag-js';
import fsOperation from '../fileSystem/fsOperation';
import openFile from '../lib/openFile';
import recents from '../lib/recents';
import helpers from '../utils/helpers';
import Url from '../utils/Url';
import inputhints from './inputhints';

export default async function findFile() {
  const $input = tag('input', {
    type: 'search',
    placeholder: 'Type filename',
    onfocusout: remove,
  });
  const $mask = tag('span', {
    className: 'mask',
    onclick() {
      remove();
    },
  })
  const $pallete = tag('div', {
    id: 'command-pallete',
    children: [$input],
  });

  inputhints($input, generateHints, onselect);

  actionStack.push({
    id: 'command-pallete',
    action: remove,
  });

  window.restoreTheme(true);
  app.append($pallete, $mask);
  $input.focus();

  function remove() {
    window.restoreTheme();
    $mask.remove();
    $pallete.remove();
  }

  /**
   * Generates hint for inputhints
   * @param {function({text: string, value: string}[]):void} setHints 
   */
  async function generateHints(setHints) {
    setHints([{
      text: strings['loading...'],
      value: '',
    }]);
    const files = [];
    const dirs = addedFolder.map(({ url }) => url);
    try {
      await listDir(files, dirs);
      setHints(files);
    } catch (error) {
      toast('Unable to load all files.');
      remove();
    }
  }

  /**
   * Get all file recursively
   * @param {Array} list 
   * @param {string} dir 
   */
  async function getAllFiles(list, dir, root) {
    const ls = await fsOperation(dir).lsDir();
    const dirs = [];
    ls.forEach((item) => {
      const { name, url, isDirectory } = item;

      if (isDirectory) {
        dirs.push(url);
        return;
      }

      const vRoot = helpers.getVirtualPath(root);
      const vRootDir = Url.dirname(vRoot);
      const vUrl = helpers.getVirtualPath(url);
      const path = Url.dirname(vUrl.subtract(vRootDir)).replace(/\/$/, '');
      const recent = recents.files.find((file) => file === url);
      list.push({
        text: `<div style="display: flex; flex-direction: column;">
          <strong ${recent ? `data-str='${strings['recently used']}'` : ''} style="font-size: 1rem;">${name}</strong>
          <span style="font-size: 0.8rem; opacity: 0.8;">${path}</span>
        <div>`,
        value: url,
      });
    });

    await listDir(list, dirs, root);
  }

  /**
   * 
   * @param {Array} list 
   * @param {string[]} dirs 
   */
  async function listDir(list, dirs, root) {
    const dir = dirs.shift();
    if (!dir) return;
    await getAllFiles(list, dir, root ?? dir);
    if (dirs.length) await listDir(list, dirs, root ?? dir);
  }

  function onselect(value) {
    if (!value) return;
    openFile(value);
    remove();
  }
}