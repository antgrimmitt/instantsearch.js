import {forEach, reduce, groupBy, findIndex, find, filter} from 'lodash';
import documentation from 'documentation';

let cachedFiles;

export default function({rootJSFile}) {
  return function(files, metalsmith, done) {
    console.log('before documentationjs');
    documentation.build(rootJSFile, {}, (e, symbols) => {
      if(e) done(e);
      else {
        console.log('after documentationjs');

        mapConnectors(filterSymbolsByType('Connector', symbols), symbols, files),
        mapWidgets(filterSymbolsByType('WidgetFactory', symbols), symbols, files),

        done();
      }
    });
  };
}

function filterSymbolsByType(type, symbols) {
  return filter(symbols, (s) => {
    const index = findIndex(s.tags, t => t.title === 'type' && t.type.name === type);
    return index !== -1;
  });
}

function mapConnectors(connectors, symbols, files) {
  return forEach(connectors, symbol => {
    console.log(symbol.name);
    const fileName = `connectors/${symbol.name}.html`;

    const symbolWithRelatedType = {
      ...symbol,
      relatedTypes: findRelatedTypes(symbol, symbols),
    };

    files[fileName] = {
      mode: '0764',
      contents: '',
      title: symbol.name,
      mainTitle: `connectors`, //
      withHeadings: false,
      layout: `connector.pug`,
      category: 'Connector',
      navWeight: symbol.name,
      jsdoc: symbolWithRelatedType,
    };
  });
}

function mapWidgets(widgets, symbols, files) {
  return forEach(widgets, symbol => {
    console.log(symbol.name);
    const fileName = `widgets/${symbol.name}.html`;

    const symbolWithRelatedType = {
      ...symbol,
      relatedTypes: findRelatedTypes(symbol, symbols),
    };

    files[fileName] = {
      mode: '0764',
      contents: '',
      title: symbol.name,
      mainTitle: `widgets`,
      withHeadings: false,
      layout: `widget.pug`,
      category: 'WidgetFactory',
      navWeight: symbol.name,
      jsdoc: symbolWithRelatedType,
    };
  });
}

function findRelatedTypes(functionSymbol, symbols) {
  let types = [];
  if(!functionSymbol) return types;

  const findParamsTypes = p => {
    if (!p) return;
    const currentParamType = p.type.type;
    if (currentParamType === 'FunctionType') {
      types = [...types, ...findRelatedTypes(p.type, symbols)]
    } else if (currentParamType === 'UnionType') {
      forEach(p.type.elements, e => { findParamsTypes({name: e.name, type: e}); });
    } else if (currentParamType === 'OptionalType') {
      findParamsTypes({name: p.type.expression.name, type: p.type.expression});
    } else if (p.name === '$0') {
      const unnamedParameterType = p.type.name;
      const typeSymbol = find(symbols, {name: unnamedParameterType});
      types = [...types, typeSymbol, ...findRelatedTypes(typeSymbol, symbols)]
    } else {
      const currentTypeName = p.name;
      const isCustomType = currentTypeName && currentTypeName !== 'Object' && currentTypeName[0] === currentTypeName[0].toUpperCase();
      if (isCustomType) {
        const typeSymbol = find(symbols, {name: currentTypeName});
        types = [...types, typeSymbol];
      }
    }
  };

  forEach(functionSymbol.params, findParamsTypes);
  forEach(functionSymbol.returns, findParamsTypes);
  forEach(functionSymbol.properties, findParamsTypes);

  return types;
}