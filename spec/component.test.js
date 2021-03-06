const {JSDOM} = require('jsdom');
const dom = new JSDOM(require('fs').readFileSync(__dirname + 
    '/component.test.html', 
    'UTF8'));
const document = dom.window.document;    
const Component = require(__dirname + '/../component.js');
const setDocument = require(__dirname + '/../component.js').setDocument;

describe('Component', () => {
    beforeEach(() => {
        setDocument(document);
    });

    it('Should load component contents from a file.', (done) => {
        Component.initialize('testComponent', 
            'spec/components/testComponent.html')
            .then((prototype) => {
                expect(prototype.contents.length).toBeGreaterThan(0);
                expect(!!Component.components['testComponent']).toBe(true);
                expect(Component.components['testComponent'].classname)
                    .toBe('Component');
                done();
            });
    });

    it('Should only load component contents once, unless explicitly ' + 
        'requested.', (done) => {
            // This test will break if jQuery is swapped for another lib...
            spyOn($, 'ajax').and.callThrough();
            expect($.ajax.calls.count()).toBe(0);
            Component.initialize('testComponent', 
                'spec/components/testComponent.html')
                .then((prototype) => {
                    expect($.ajax.calls.count()).toBe(1);
                    Component.initialize('testComponent', 
                        'spec/components/testComponent.html').then((prototype) => {
                            expect($.ajax.calls.count()).toBe(1);
                            done();
                        });
                });
        });

    it('Should allow a component to be instanced.', (done) => {
            Component.initialize('testComponent', 
                'spec/components/testComponent.html')
                .then((prototype) => {
                    Component.instance(document.getElementById('container'), 
                        'testComponent').then((instance) => {
                            expect(document.querySelectorAll('test-component')
                                .length).toBe(1);
                            done();
                        });
                });
        });

    it('Should allow a Component.instance to perform a instance of a ' + 
        'component using the configured class.', (done) => {
            var TestComponent = require(__dirname + 
                '/components/testComponent.js');
            Component.initialize('testComponent', 
                'spec/components/testComponent.html',
                TestComponent)
                .then((prototype) => {
                    Component.instance(document.getElementById('container'), 
                        'testComponent').then((instance) => {
                            expect(document.querySelectorAll('test-component')
                                .length).toBe(1);
                            // Fails unless TestComponent is instantiated...
                            expect(instance.foo).toBe('bar');
                            done();
                        });
                });
        });

    it('Should properly set the component ID and the instance ID for the ' + 
        'specific component', (done) => {
            // This deeply nested test though...
            var TestComponent = require(__dirname + 
                '/components/testComponent.js');
            const getIds = (name, idx = 0) => {
                const id = document
                    .querySelectorAll(name)[idx]
                    .getAttribute('data-component-id');
                const instanceId = document
                    .querySelectorAll(name)[idx]
                    .getAttribute('data-instance-id');
                return [id, instanceId];
            };
            Component.initialize('testComponent', 
                'spec/components/testComponent.html',
                TestComponent)
                .then((prototype) => {
                Component.initialize('testComponent2', 
                    'spec/components/testComponent.html')
                    .then((prototype) => {
                    Component.instance(document.getElementById('container'), 
                        'testComponent').then(() => {
                            const [id, instanceId] = getIds('test-component');
                            expect(id).toBe('1');
                            expect(instanceId).toBe('1');
                            Component.instance(document
                                .getElementById('container'), 
                                'testComponent2').then(() => {
                                    const [id, instanceId] = 
                                        getIds('test-component2');
                                    expect(id).toBe('2');
                                    expect(instanceId).toBe('1');
                                    Component.instance(document
                                        .getElementById('container'), 
                                        'testComponent').then(() => {
                                            const [id, instanceId] = 
                                                getIds('test-component', 1);
                                            expect(id).toBe('3');
                                            expect(instanceId).toBe('2');
                                            done();
                                        });
                                });
                        });
                    });
                });
        });

    it('Should allow multiple components to be initialized simultaneously ' +
        'via an array.', () => {
        });

    it('Should properly convert component names to element-formatted names',
        () => {
            expect(Component.toElementName('todoList')).toBe('todo-list');
            expect(Component.toElementName('fooHTTP')).toBe('foo-http');
            // not pretty, but better than fooHTTPbar -> foo-http-bar
            // and HTMLParser -> htmlp-arser
            expect(Component.toElementName('fooHTTPbar')).toBe('foo-httpbar');
            expect(Component.toElementName('HTMLParser')).toBe('htmlparser');
        });

    it('Should allow an HTML string to properly call Component.load with ' + 
        'parameters.', (done) => {
            var TestComponent = require(__dirname + 
                '/components/testComponent.js');
            Component.initialize('testComponent', 
                'spec/components/testComponent.html',
                TestComponent)
                .then((prototype) => {
                    Component.instance(document.getElementById('container'), 
                        'testComponent', 1, 2, 3).then((instance) => {
                            expect(instance.args.length).toBe(3);
                            expect(instance.args[0]).toBe(1);
                            done();
                        });
                });
        });

    it('Should allow a single-value model to be rendered in a template.', 
        (done) => {
        var TestComponent = require(__dirname + '/components/testComponent.js');
        const component = new TestComponent(document
            .getElementById('container'));
        component.model.foo = 'bar';
        component.initialized.then(() => {
            let contents =   
                document.querySelectorAll('test-component')[0].textContent;
            component.model.foo = 'yogurt';
            component.render();
            // A lot of testing for yogurt...
            contents =   
                document.querySelectorAll('test-component')[0].textContent;
            expect(contents).toBe('yogurt');

            // Now, test out a function in the model...
            let food = 'granola';
            component.model.foo = function() {
                // Something more complicated...
                return food;
            };
            component.render();
            contents =   
                document.querySelectorAll('test-component')[0].textContent;
            expect(contents).toBe('granola');
            // The function and the template updates via an outside variable...
            food = 'kale';
            component.render();
            contents =   
                document.querySelectorAll('test-component')[0].textContent;
            expect(contents).toBe('kale');

            //Now, test an object...
            done();
        });
    });

    it('Should allow a simple, single-value model to be rendered ' + 
        'multiple places in a template.', () => {
            const component = 
                new Component(document.getElementById('container'), 'simpleModel',
                'spec/components/simpleModel.html');
            component.initialized.then(() => {
                component.model.foo = 'yogurt';
                component.render();
                let contents1 =   
                    document.querySelectorAll('simple-model>div')[0]
                        .textContent.trim();
                let contents2 =   
                    document.querySelectorAll('simple-model>div>span')[0]
                        .textContent.trim();
                let contents3 =   
                    document.querySelectorAll('simple-model>div>span')[1]
                        .textContent.trim();
                expect(contents1.startsWith('yogurt') && 
                    contents1.match(/yogurt/g).length == 2).toBe(true);
                expect(contents2).toBe('');
                expect(contents3).toBe('yogurt');
                component.model.foo = '';
                component.model.bar = 'granola';
                component.render();
                contents1 =   
                    document.querySelectorAll('simple-model>div')[0]
                        .textContent.trim();
                contents2 =   
                    document.querySelectorAll('simple-model>div>span')[0]
                        .textContent.trim();
                contents3 =   
                    document.querySelectorAll('simple-model>div>span')[1]
                        .textContent.trim();
                expect(contents1).toBe('granola');
                expect(contents2).toBe('granola');
                expect(contents3).toBe('');
            });
        });

    it('Should allow a simple, multiple-value model to be rendered ' + 
        'multiple places in a template.', () => {
        });

    it('Should allow a simple, multiple-value model to be rendered ' + 
        'multiple places in a template.', () => {
        });

    it('Should allow a component to be rendered with an undefined model or ' + 
        'a model that throws an error.', () => {

    });

    it('Should properly capture invalidation across data types: string, ' + 
        'number, function.', () => {

        });

    it('Should allow subsequent calls of render to render model updates.',
        () => {

        });
    
    it('Should update only parts of the DOM during render that contain ' + 
        'model updates.', () => {

        });

    it('When a component instnace is removed, it should also properly ' +
        'decrement all counters and remove references.', () => {

        });

    afterEach(() => {
        document.getElementById('container').innerHTML = '';
        Component.promises = {};
        Component.components = {};
        Component.numComponents = 0;
        Component.createdComponents = 0;
        Component.instances = {};
        Component.createdInstances = {};
        Component.promises = {};
    });
});