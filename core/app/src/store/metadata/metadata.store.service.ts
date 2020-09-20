import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {distinctUntilChanged, map, shareReplay, tap} from 'rxjs/operators';
import {EntityGQL} from '@services/api/graphql-api/api.entity.get';
import {deepClone} from '@base/utils/object-utils';
import {StateStore} from '@base/store/state';
import {AppStateStore} from '@store/app-state/app-state.store';
import {MenuItemLink} from '@components/navbar/navbar.abstract';
import {Panel, ViewFieldDefinition} from '@app-common/metadata/metadata.model';
import {ModeActions} from '@app-common/actions/action.model';

export interface ChartType {
    key: string;
    labelKey: string;
    type: string;
}

export interface ChartTypesMap {
    [key: string]: ChartType;
}

export interface BulkAction {
    key: string;
    labelKey: string;
    params: { [key: string]: any };
    acl: string[];
}

export interface BulkActionsMap {
    [key: string]: BulkAction;
}

export interface LineAction {
    key: string;
    labelKey: string;
    label: string;
    module: string;
    legacyModuleName: string;
    icon: string;
    action: string;
    returnAction: string;
    params: { [key: string]: any };
    mapping: { [key: string]: any };
    link: MenuItemLink;
    acl: string[];
}

export interface ListViewMeta {
    fields: ColumnDefinition[];
    bulkActions: BulkActionsMap;
    lineActions: LineAction[];
    chartTypes: ChartTypesMap;
    filters: Filter[];
}

export interface Filter {
    id: string;
    name: string;
    contents: { [key: string]: any };
}

export interface ColumnDefinition extends ViewFieldDefinition {
    width: string;
    default: boolean;
    module: string;
    id: string;
    sortable: boolean;
}

export interface SearchMetaField {
    name?: string;
    type?: string;
    label?: string;
    default?: boolean;
    options?: string;
}

export interface SearchMeta {
    layout: {
        basic?: { [key: string]: SearchMetaField };
        advanced?: { [key: string]: SearchMetaField };
    };
}

export interface RecordViewMetadata {
    actions: ModeActions;
    templateMeta: RecordTemplateMetadata;
    panels: Panel[];
}

export interface RecordTemplateMetadata {
    maxColumns: number;
    useTabs: boolean;
    tabDefs: TabDefinitions;
}

export interface TabDefinitions {
    [key: string]: TabDefinition;
}

export interface TabDefinition {
    newTab: boolean;
    panelDefault: 'expanded' | 'collapsed';
}

/* eslint-disable camelcase*/
export interface SubPanelTopButton {
    key: string;
    labelKey: string;
}

/* eslint-enable camelcase*/

export interface SubPanelCollectionList {
    [key: string]: SubPanelCollectionItem;
}

/* eslint-disable camelcase*/
export interface SubPanelCollectionItem {
    module: string;
    subpanel_name: string;
    get_subpanel_data: string;
}

/* eslint-enable camelcase*/

export interface SubPanelMeta {
    [key: string]: SubPanel;
}

/* eslint-disable camelcase*/
export interface SubPanel {
    order?: 10;
    sort_order?: string;
    sort_by?: string;
    title_key?: string;
    type?: string;
    subpanel_name?: string;
    header_definition_from_subpanel?: string;
    module?: string;
    top_buttons?: SubPanelTopButton[];
    collection_list: SubPanelCollectionList;
}

/* eslint-enable camelcase*/

export interface Metadata {
    detailView?: any;
    editView?: any;
    listView?: ListViewMeta;
    search?: SearchMeta;
    recordView?: RecordViewMetadata;
    subPanel?: SubPanelMeta;
}

const initialState: Metadata = {
    detailView: {},
    editView: {},
    listView: {} as ListViewMeta,
    search: {} as SearchMeta,
    recordView: {} as RecordViewMetadata,
    subPanel: {} as SubPanelMeta
};


let internalState: Metadata = deepClone(initialState);


export interface MetadataCache {
    [key: string]: BehaviorSubject<Metadata>;
}

const initialCache: MetadataCache = {} as MetadataCache;

let cache: MetadataCache = deepClone(initialCache);

@Injectable({
    providedIn: 'root',
})
export class MetadataStore implements StateStore {

    /**
     * Public long-lived observable streams
     */
    fields$: Observable<ColumnDefinition[]>;
    listMetadata$: Observable<ListViewMeta>;
    searchMetadata$: Observable<SearchMeta>;
    recordViewMetadata$: Observable<RecordViewMetadata>;
    metadata$: Observable<Metadata>;
    subPanelMetadata$: Observable<SubPanelMeta>;

    protected store = new BehaviorSubject<Metadata>(internalState);
    protected state$ = this.store.asObservable();
    protected resourceName = 'viewDefinition';
    protected fieldsMetadata = {
        fields: [
            'id',
            '_id',
        ]
    };
    protected types = [
        'listView',
        'search',
        'recordView',
        'subPanel'
    ];

    constructor(protected recordGQL: EntityGQL, protected appState: AppStateStore) {
        this.fields$ = this.state$.pipe(map(state => state.listView.fields), distinctUntilChanged());
        this.listMetadata$ = this.state$.pipe(map(state => state.listView), distinctUntilChanged());
        this.searchMetadata$ = this.state$.pipe(map(state => state.search), distinctUntilChanged());
        this.recordViewMetadata$ = this.state$.pipe(map(state => state.recordView), distinctUntilChanged());
        this.subPanelMetadata$ = this.state$.pipe(map(state => state.subPanel), distinctUntilChanged());
        this.metadata$ = this.state$;
    }

    /**
     * Clear state
     */
    public clear(): void {
        Object.keys(cache).forEach(key => {
            cache[key].unsubscribe();
        });
        cache = deepClone(initialCache);
        this.updateState(deepClone(initialState));
    }

    public clearAuthBased(): void {
    }

    /**
     * Get all metadata types
     *
     * @returns {string[]} metadata types
     */
    public getMetadataTypes(): string[] {
        return this.types;
    }

    public get(): Metadata {
        return internalState;
    }

    /**
     * Initial ListViewMeta load if not cached and update state.
     *
     * @param {string} moduleID to fetch
     * @param {string[]} types to fetch
     * @returns {any} data
     */
    public load(moduleID: string, types: string[]): any {

        if (!types) {
            types = this.getMetadataTypes();
        }

        return this.getMetadata(moduleID, types).pipe(
            tap((metadata: Metadata) => {
                this.updateState(metadata);
            })
        );
    }

    /**
     * Internal API
     */

    /**
     * Update the state
     *
     * @param {object} state to set
     */
    protected updateState(state: Metadata): void {
        this.store.next(internalState = state);
    }

    /**
     * Get ListViewMeta cached Observable or call the backend
     *
     * @param {string} module to fetch
     * @param {string[]} types to retrieve
     * @returns {object} Observable<any>
     */
    protected getMetadata(module: string, types: string[]): Observable<Metadata> {

        let metadataCache: BehaviorSubject<Metadata> = null;
        // check for currently missing and
        const missing = {};
        const loadedTypes = {};

        if (cache[module]) {
            metadataCache = cache[module];

            types.forEach(type => {

                const cached = metadataCache.value;

                if (!cached[type]) {
                    missing[type] = type;
                    return;
                }

                if (Object.keys(cached[type]).length === 0) {
                    missing[type] = type;
                } else {
                    loadedTypes[type] = cached[type];
                }
            });

            if (Object.keys(missing).length === 0) {
                return of(metadataCache.value).pipe(shareReplay(1));
            }
        } else {
            cache[module] = new BehaviorSubject({} as Metadata);
        }

        return this.fetchMetadata(module, types).pipe(
            map((value: Metadata) => {

                Object.keys(loadedTypes).forEach((type) => {
                    value[type] = loadedTypes[type];
                });

                return value;
            }),
            shareReplay(1),
            tap((value: Metadata) => {
                cache[module].next(value);
            })
        );
    }

    /**
     * Fetch the Metadata from the backend
     *
     * @param {string} module to fetch
     * @param {string[]} types to retrieve
     * @returns {object} Observable<{}>
     */
    protected fetchMetadata(module: string, types: string[]): Observable<Metadata> {

        const fieldsToRetrieve = {
            fields: [
                ...this.fieldsMetadata.fields,
                ...types
            ]
        };

        return this.recordGQL.fetch(this.resourceName, `/api/metadata/view-definitions/${module}`, fieldsToRetrieve)
            .pipe(
                map(({data}) => {

                    const metadata: Metadata = {} as Metadata;
                    this.parseListViewMetadata(data, metadata);
                    this.parseSearchMetadata(data, metadata);
                    this.parseRecordViewMetadata(data, metadata);
                    this.parseSubPanelMetadata(data, metadata);

                    return metadata;
                })
            );
    }

    protected parseListViewMetadata(data, metadata: Metadata): void {

        if (!data || !data.viewDefinition.listView) {
            return;
        }

        const listViewMeta: ListViewMeta = {
            fields: [],
            bulkActions: {},
            lineActions: [],
            chartTypes: {},
            filters: []
        };

        if (data.viewDefinition.listView.columns) {
            data.viewDefinition.listView.columns.forEach((field: ColumnDefinition) => {
                listViewMeta.fields.push(
                    field
                );
            });
        }

        const entries = {
            bulkActions: 'bulkActions',
            lineActions: 'lineActions',
            availableCharts: 'chartTypes',
            availableFilters: 'filters'
        };

        this.addDefinedMeta(listViewMeta, data.viewDefinition.listView, entries);

        metadata.listView = listViewMeta;
    }

    protected parseSearchMetadata(data, metadata: Metadata): void {
        if (data && data.viewDefinition.search) {
            metadata.search = data.viewDefinition.search;
        }
    }

    protected parseSubPanelMetadata(data, metadata: Metadata): void {
        if (data && data.viewDefinition.subPanel) {
            metadata.subPanel = data.viewDefinition.subPanel;
        }
    }

    protected parseRecordViewMetadata(data, metadata: Metadata): void {
        if (!data || !data.viewDefinition.recordView) {
            return;
        }

        const recordViewMeta: RecordViewMetadata = {
            actions: {} as ModeActions,
            templateMeta: {} as RecordTemplateMetadata,
            panels: []
        };

        const receivedMeta = data.viewDefinition.recordView;
        const entries = {templateMeta: 'templateMeta', actions: 'actions', panels: 'panels'};

        this.addDefinedMeta(recordViewMeta, receivedMeta, entries);

        metadata.recordView = recordViewMeta;
    }

    protected addDefinedMeta(
        metadata: { [key: string]: any },
        received: { [key: string]: any },
        keyMap: { [key: string]: string }
    ): void {
        Object.keys(keyMap).forEach(dataKey => {
            const metadataKey = keyMap[dataKey];
            if (received[dataKey]) {
                metadata[metadataKey] = received[dataKey];
            }
        });
    }
}
