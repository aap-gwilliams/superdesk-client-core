describe('templates', () => {
    beforeEach(window.module('superdesk.core.auth.session'));
    beforeEach(window.module('superdesk.apps.templates'));
    beforeEach(window.module('superdesk.templates-cache'));
    beforeEach(window.module('superdesk.apps.searchProviders'));
    beforeEach(inject(($httpBackend) => {
        $httpBackend.whenGET(/api$/).respond({_links: {child: []}});
    }));

    describe('templates widget', () => {
        var existingTemplate = {template_name: 'template1', template_desks: ['sports'], is_public: true, user: 'foo'};

        beforeEach(inject((desks, api, $q, session, privileges, vocabularies, content) => {
            spyOn(desks, 'fetchCurrentUserDesks').and.returnValue($q.when({_items: []}));
            spyOn(api, 'save').and.returnValue($q.when({}));
            spyOn(api, 'find').and.returnValue($q.when(existingTemplate));
            spyOn(privileges, 'userHasPrivileges').and.returnValue(true);
            session.identity = {_id: 'foo', user_type: 'user'};
            spyOn(vocabularies, 'getVocabularies').and.returnValue(Promise.resolve([]));
            spyOn(content, 'setupAuthoring').and.callFake((profile, scope, item) => {
                scope.editor = {};
                scope.schema = {};

                return Promise.resolve({});
            });
        }));

        it('can create template', (done) => inject(($controller, api) => {
            var item = _.create({slugline: 'FOO', headline: 'foo'});
            var ctrl = $controller('CreateTemplateController', {item: item});

            expect(ctrl.name).toBe('FOO');
            expect(ctrl.type).toBe('create');
            ctrl.name = 'test';
            ctrl.desk = 'news';
            ctrl.hasCrops = true;
            ctrl.save();

            setTimeout(() => {
                expect(api.save).toHaveBeenCalledWith('content_templates', {
                    template_name: 'test',
                    template_type: 'create',
                    template_desks: null,
                    is_public: false,
                    user: 'foo',
                    data: {
                        headline: 'foo',
                        slugline: 'FOO',
                    },
                }, null);

                done();
            }, 200);
        }));

        it('can update template', (done) => inject(($controller, api, $rootScope, session) => {
            var item = _.create({slugline: 'FOO', template: '123'});
            var ctrl = $controller('CreateTemplateController', {item: item});

            $rootScope.$digest();
            session.identity = {_id: 'foo', user_type: 'user'};

            expect(api.find).toHaveBeenCalledWith('content_templates', '123');
            expect(ctrl.name).toBe(existingTemplate.template_name);
            expect(ctrl.type).toBe('create');
            expect(ctrl.desk).toBe('sports');
            ctrl.save();

            setTimeout(() => {
                expect(api.save.calls.argsFor(0)[1]).toBe(existingTemplate);

                done();
            }, 200);
        }));

        it('can create new using old template data', (done) => inject(($controller, api, $rootScope, session) => {
            var item = _.create({slugline: 'foo', template: '123'});
            var ctrl = $controller('CreateTemplateController', {item: item});

            $rootScope.$digest();
            session.identity = {_id: 'foo', user_type: 'user'};

            ctrl.name = 'rename it';
            ctrl.is_public = true;
            ctrl.save();

            setTimeout(() => {
                expect(api.save.calls.argsFor(0)[1]).not.toBe(existingTemplate);
                expect(api.save.calls.argsFor(0)[1].is_public).toBe(true);
                expect(api.save.calls.argsFor(0)[1].template_desks[0]).toBe('sports');
                expect(api.save.calls.argsFor(0)[1].template_desks.length).toBe(1);

                done();
            }, 200);
        }));
    });

    describe('templates service', () => {
        beforeEach(inject(($q, api) => {
            spyOn(api, 'query').and.returnValue($q.when());
        }));

        beforeEach(inject((session) => {
            session.identity = {_id: 'foo', user_type: 'user'};
        }));

        it('can fetch templates using default parameters', inject((api, templates) => {
            templates.fetchTemplatesByUserDesk();
            expect(api.query).not.toHaveBeenCalledWith('content_templates');
        }));
        it('can fetch templates using type parameter', inject((api, templates) => {
            templates.fetchTemplatesByUserDesk('foo', undefined, undefined, undefined, 'create');
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                sort: 'template_name',
                where: '{"$and":[{"$or":[{"$or":[{"template_desks":{"$exists":false}},' +
                       '{"template_desks":[]}]},' +
                       '{"user":"foo"}],"template_type":"create"}]}',
            });
        }));
        it('can fetch templates using desk parameter', inject((api, templates) => {
            templates.fetchTemplatesByUserDesk('foo', 'desk1', 2, 10);
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                sort: 'template_name',
                where: '{"$and":[{"$or":[{"$or":[{"template_desks":{"$exists":false}},' +
                '{"template_desks":[]},' +
                '{"template_desks":{"$in":["desk1"]}}]},' +
                '{"user":"foo"}]}]}',
            });
        }));
        it('can fetch templates using keyword parameter', inject((api, templates) => {
            templates.fetchTemplatesByUserDesk('foo', undefined, undefined, undefined, undefined, 'keyword');
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                sort: 'template_name',
                where: '{"$and":[{"$or":[{"$or":[{"template_desks":{"$exists":false}},' +
                '{"template_desks":[]}]},' +
                '{"user":"foo"}],' +
                '"template_name":{"$regex":"keyword","$options":"-i"}}]}',
            });
        }));
        it('can fetch templates by id', inject((api, templates) => {
            templates.fetchTemplatesByIds([123, 456]);
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                where: '{"_id":{"$in":[123,456]}}',
            });
        }));
        it('can add recent templates', inject((api, templates, preferencesService, $q, $rootScope) => {
            spyOn(preferencesService, 'get').and.returnValue($q.when({}));
            spyOn(preferencesService, 'update').and.returnValue($q.when());
            templates.addRecentTemplate('desk1', 'template1');
            $rootScope.$digest();
            expect(preferencesService.update).toHaveBeenCalledWith({
                'templates:recent': {
                    desk1: ['template1'],
                },
            });
        }));
        it('can get recent templates', inject((api, templates, preferencesService, $q, $rootScope) => {
            spyOn(preferencesService, 'get').and.returnValue($q.when({
                'templates:recent': {
                    desk2: ['template2', 'template3'],
                },
            }));
            templates.getRecentTemplates('desk2');
            $rootScope.$digest();
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                where: '{"_id":{"$in":["template2","template3"]}}',
            });
        }));

        it('can save template', inject((api, templates, $q, $rootScope) => {
            spyOn(api, 'save').and.returnValue($q.when({}));
            var orig = {};
            var data = {hasCrops: 1};

            templates.save(orig, data);
            expect(api.save).toHaveBeenCalledWith('content_templates', orig, {data: {headline: '', body_html: ''}});
        }));

        it('can fetch templates all templates with user type as user', inject((api, templates, $rootScope) => {
            templates.fetchAllTemplates();
            $rootScope.$digest();
            expect(api.query).toHaveBeenCalledWith('content_templates', {
                sort: 'template_name',
                manage: true,
            });
        }));

        it('can fetch templates all templates with user type user with privileges',
            inject((api, templates, privileges, desks, $q, $rootScope) => {
                privileges.privileges.content_templates = 1;
                spyOn(desks, 'fetchCurrentUserDesks').and.returnValue($q.when([
                    {_id: 'finance'},
                    {_id: 'sports'},
                ]));

                templates.fetchAllTemplates();
                $rootScope.$digest();
                expect(api.query).toHaveBeenCalledWith('content_templates', {
                    sort: 'template_name',
                    manage: true,
                });
            }));

        it('can fetch templates all templates with user type as administrator',
            inject((api, templates, session, $rootScope) => {
                session.identity = {_id: 'foo', user_type: 'administrator'};
                templates.fetchAllTemplates(1, 50);
                $rootScope.$digest();
                expect(api.query).toHaveBeenCalledWith('content_templates', {
                    sort: 'template_name',
                    manage: true,
                });
            }));

        it('can fetch templates all templates with type parameter as administrator',
            inject((api, templates, session, $rootScope) => {
                session.identity = {_id: 'foo', user_type: 'administrator'};
                templates.fetchAllTemplates(1, 50, 'create');
                $rootScope.$digest();
                expect(api.query).toHaveBeenCalledWith('content_templates', {
                    sort: 'template_name',
                    where: '{"$and":[{"template_type":"create"}]}',
                    manage: true,
                });
            }));

        it('can fetch templates all templates with type parameter and template name',
            inject((api, templates, $rootScope) => {
                templates.fetchAllTemplates(1, 50, 'create', 'test');
                $rootScope.$digest();
                expect(api.query).toHaveBeenCalledWith('content_templates', {
                    sort: 'template_name',
                    where: '{"$and":[{"template_type":"create","template_name":{"$regex":"test","$options":"-i"}}]}',
                    manage: true,
                });
            }));
    });

    describe('template select directive', () => {
        it('can fetch desk templates and user private templates together',
            inject((api, session, desks, $rootScope, $compile, $q) => {
                $rootScope.$digest(); // let it reset identity in auth
                session.identity = {_id: 'foo'};
                spyOn(desks, 'getCurrentDeskId').and.returnValue('sports');
                spyOn(api, 'query').and.returnValue($q.when({_items: [
                    {_id: 'public1', template_desks: ['foo']},
                    {_id: 'public2', template_desks: ['foo']},
                    {_id: 'private', is_public: false},
                ], _meta: {total: 3}}));
                var scope = $rootScope.$new();

                scope.open = {};
                var elem = $compile('<div sd-template-select data-open="open"></div>')(scope);

                $rootScope.$digest();
                expect(api.query).toHaveBeenCalled();
                var args = api.query.calls.argsFor(0);

                expect(args[0]).toBe('content_templates');
                $rootScope.$digest();
                var iscope = elem.isolateScope();

                expect(iscope.publicTemplates.length).toBe(2);
                expect(iscope.privateTemplates.length).toBe(1);
            }));
    });
});
