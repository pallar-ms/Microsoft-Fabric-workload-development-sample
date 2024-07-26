import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Stack } from "@fluentui/react";
import {
    Button,
    Checkbox,
    Combobox,
    Divider,
    Field,
    Input,
    Label,
    Option,
    Radio,
    RadioGroup,
    SelectTabData,
    Switch,
    Tab,
    TabList,
    TabValue,
    useId,
} from "@fluentui/react-components";
import { initializeIcons } from "@fluentui/font-icons-mdl2";
import {
    Save24Regular,
    AlertOn24Regular,
    PanelRightExpand20Regular,
    Database16Regular,
    TriangleRight20Regular
} from "@fluentui/react-icons";
import { ContextProps, PageProps } from "src/App";
import {
    callNotificationOpen,
    callNotificationHide,
    callPanelOpen,
    callDialogOpenMsgBox,
    callErrorHandlingOpenDialog,
    callErrorHandlingRequestFailure,
    callNavigationNavigate,
    callPageOpen,
    callNavigationBeforeNavigateAway,
    callNavigationAfterNavigateAway,
    callThemeGet,
    callThemeOnChange,
    callSettingsGet,
    callSettingsOnChange,
    themeToView,
    settingsToView,
    callActionExecute,
    callDatahubOpen,
    callItemGet,
    callItemUpdate,
    callItemDelete,
    callConvertItemConvertOperation
} from "../../controller/ConvertWorkloadController";
import { Ribbon } from "../ConvertWorkloadRibbon/ConvertWorkloadRibbon";
import { convertGetItemResultToWorkloadItem } from "../../utils";
import {
    GenericItem,
    ItemPayload,
    UpdateItemPayload,
    WorkloadItem,
    ConvertItemClientMetadata,
} from "../../models/ConvertWorkloadModel";
import "./../../styles.scss";
import { LakehouseExplorerComponent } from "../SampleWorkloadLakehouseExplorer/SampleWorkloadLakehouseExplorer";

export function ConvertWorkloadEditor(props: PageProps) {
    const convertWorkloadName = process.env.WORKLOAD_NAME;
    const convertWorkloadBEUrl = process.env.WORKLOAD_BE_URL;
    const { workloadClient } = props;
    const pageContext = useParams<ContextProps>();
    const { pathname } = useLocation();

    // initializing usage of FluentUI icons
    initializeIcons();

    // React state for WorkloadClient APIs
    const [apiNotificationTitle, setNotificationTitle] = useState<string>("");
    const [apiNotificationMessage, setNotificationMessage] = useState<string>("");
    const [notificationId, setNotificationId] = useState<string>("");
    const [notificationValidationMessage, setNotificationValidationMessage] = useState<string>("");
    const [apiPanelIsLightDismiss, setApiPanelIsLightDismiss] = useState<boolean>(false);
    const [apiDialogMsgboxTitle, setApiDialogMsgboxTitle] = useState<string>("");
    const [apiDialogMsgboxContent, setApiDialogMsgboxContent] = useState<string>("");
    const [apiDialogMsgboxButtonCount, setApiDialogMsgboxButtonCount] = useState<number>(0);
    const [apiErrorTitle, setApiErrorTitle] = useState<string>("");
    const [apiErrorMessage, setApiErrorMessage] = useState<string>("");
    const [apiErrorFailureMessage, setApiErrorFailureMessage] = useState<string>("");
    const [apiErrorFailureCode, setApiErrorFailureCode] = useState<number>(1);
    const [apiErrorStatusCode, setApiErrorStatusCode] = useState<string>("");
    const [apiErrorRequestId, setApiErrorRequestId] = useState<string>("");
    const [apiErrorStackTrace, setApiErrorStackTrace] = useState<string>("");
    const [selectedLakehouse, setSelectedLakehouse] = useState<GenericItem>(undefined);
    const [sampleItem, setSampleItem] = useState<WorkloadItem<ItemPayload>>(undefined);
    const [inputFileName, setInputFileName] = useState<string>("");
    const [templateFileName, setTemplateFileName] = useState<string>("");
    const [convertServiceEndpoint, setConvertServiceEndpoint] = useState<string>("");
    const [convertResponse, setConvertResponse] = useState<string>("");
    const [isDirty, setDirty] = useState<boolean>(false);

    const msgboxButtonCountOptions = ["0", "1", "2", "3"];
    const radioName = useId("radio");
    const labelId = useId("label");
    const inputId = useId("input");

    // load the existing Item (via its objectId)
    useMemo(() => loadDataFromUrl(pageContext, pathname), [pageContext, pathname]);

    const [selectedTab, setSelectedTab] = useState<TabValue>("home");
    const [selectedApiTab, setSelectedApiTab] = useState<TabValue>("apiNotification");

    // Controller callbacks registrations:

    // register Blocking in Navigate.BeforeNavigateAway (for a forbidden url)
    callNavigationBeforeNavigateAway(workloadClient);

    // register a callback in Navigate.AfterNavigateAway
    callNavigationAfterNavigateAway(workloadClient);

    // register Theme.onChange
    callThemeOnChange(workloadClient);

    // register Settings.onChange
    callSettingsOnChange(workloadClient);

    // callback functions called by UI controls below

    function onCallNotification() {
        if (apiNotificationTitle.trim() == "") {
            setNotificationValidationMessage("Notification title is required");
            return;
        }

        setNotificationValidationMessage("");
        callNotificationOpen(
            apiNotificationTitle,
            apiNotificationMessage,
            undefined,
            undefined,
            workloadClient,
            setNotificationId
        );
    }

    function onCallNotificationHide() {
        callNotificationHide(notificationId, workloadClient, setNotificationId);
    }

    async function onCallOpenPanel() {
        callPanelOpen(convertWorkloadName, "/panel", apiPanelIsLightDismiss, workloadClient);
    }

    async function onCallOpenMessageBox() {
        const buttonNames: string[] = [];
        for (let i = 1; i <= apiDialogMsgboxButtonCount; ++i) {
            buttonNames.push(`Button ${i}`);
        }
        callDialogOpenMsgBox(
            apiDialogMsgboxTitle,
            apiDialogMsgboxContent,
            buttonNames,
            workloadClient
        );
    }

    async function onCallOpenError() {
        await callErrorHandlingOpenDialog(
            apiErrorMessage,
            apiErrorTitle,
            apiErrorStatusCode,
            apiErrorStackTrace,
            apiErrorRequestId,
            workloadClient
        );
    }

    async function onCallErrorFailureHandling() {
        await callErrorHandlingRequestFailure(
            apiErrorFailureMessage,
            apiErrorFailureCode,
            workloadClient
        );
    }

    async function onCallNavigate(path: string) {
        await callNavigationNavigate("workload", path, workloadClient);
    }

    async function onCallOpenPage() {
        await callPageOpen(convertWorkloadName, "/sample-page", workloadClient);
    }

    async function onCallThemeGet() {
        const themeString: string = themeToView(await callThemeGet(workloadClient));
        callDialogOpenMsgBox("Theme Configuration", themeString, ["OK"], workloadClient);
    }

    async function onCallSettingsGet() {
        const settingsString: string = settingsToView(await callSettingsGet(workloadClient));
        callDialogOpenMsgBox("Settings Configuration", settingsString, ["OK"], workloadClient);
    }

    async function onCallExecuteAction() {
        callActionExecute("sample.Action", convertWorkloadName, workloadClient);
    }

    async function onCallDatahub() {
        const result = await callDatahubOpen(
            "Select a Lakehouse to use for Convert Workload",
            false,
            workloadClient
        );
        if (result) {
            setSelectedLakehouse(result);
            setDirty(true);
        }
    }

    async function onConvertOperationClick() {
        try {
            setConvertResponse("");
            const result = await callConvertItemConvertOperation(
            convertWorkloadBEUrl,
            workloadClient,
            sampleItem.workspaceId,
            sampleItem.id,
            selectedLakehouse,
            inputFileName,
            templateFileName,
            convertServiceEndpoint
        );
        console.log(`Converted result: ${result.ConvertedResult}`);
        setConvertResponse(result.ConvertedResult);
        } catch (error) {
            console.error(`Error converting ${error}`);
        }
    }

    async function onConvertServiceEndpointInputChanged(value: string) {
        setConvertServiceEndpoint(value);
        setDirty(true);
    }

    async function onInputFileNameInputChanged(value: string) {
        setInputFileName(value);
        setDirty(true);
    }

    async function onTemplateFileNameInputChanged(value: string) {
        setTemplateFileName(value);
        setDirty(true);
    }

    async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
        if (pageContext.itemObjectId) {
            // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
            try {
                const getItemResult = await callItemGet(
                    pageContext.itemObjectId,
                    workloadClient
                );
                const item =
                    convertGetItemResultToWorkloadItem<ItemPayload>(getItemResult);

                setSampleItem(item);

                // load extendedMetadata
                const convertItemMetadata: ConvertItemClientMetadata =
                    item.extendedMetdata.convertItemMetadata;
                setSelectedLakehouse(convertItemMetadata?.lakehouse);
                setInputFileName(convertItemMetadata?.inputDataFileName);
                setTemplateFileName(convertItemMetadata?.templateFileName);
                setConvertServiceEndpoint(convertItemMetadata?.convertServiceEndpoint);
            } catch (error) {
                console.error(
                    `Error loading the Item (object ID:${pageContext.itemObjectId}`,
                    error
                );
                clearItemData();
            }
        } else {
            console.log(`non-editor context. Current Path: ${pathname}`);
            clearItemData();
        }
    }

    function clearItemData() {
        setSampleItem(undefined);
    }

    async function SaveItem() {
        // call ItemUpdate with the current payload contents
        console.log("Save item called")
        let payload: UpdateItemPayload = {
            convertItemMetadata: {
                lakehouse: selectedLakehouse,
                inputDataFileName: inputFileName,
                templateFileName: templateFileName,
                convertServiceEndpoint: convertServiceEndpoint
            }
        };

        await callItemUpdate(sampleItem.id, payload, workloadClient);

        setDirty(false);
    }

    async function DeleteItem() {
        if (sampleItem) {
            await callItemDelete(sampleItem.id, workloadClient);
        }
    }

    function getItemObjectId() {
        const params = useParams<ContextProps>();
        return sampleItem?.id || params.itemObjectId;
    }

    // HTML page contents
    return (
        <Stack className="editor">
            <Ribbon
                {...props}
                isLakeHouseSelected={selectedLakehouse != undefined}
                //  disable save when in Frontend-only
                isSaveButtonEnabled={
                    sampleItem?.id !== undefined && selectedLakehouse !== undefined && isDirty
                }
                saveItemCallback={SaveItem}
                isDeleteEnabled={sampleItem?.id !== undefined}
                deleteItemCallback={DeleteItem}
                itemObjectId={getItemObjectId()}
                onTabChange={setSelectedTab}
            />

            <Stack className="main">
                {["jobs", "home"].includes(selectedTab as string) && (
                    <span>
                        <h2>Convert Item Editor</h2>
                        {/* Crud item API usage example */}
                        <Divider alignContent="start">
                            {sampleItem ? "" : "New "}Item Details
                        </Divider>
                        <div className="section">
                            {sampleItem && (
                                <Label>WorkspaceId Id: {sampleItem?.workspaceId}</Label>
                            )}
                            {sampleItem && <Label>Item Id: {sampleItem?.id}</Label>}
                            {sampleItem && (
                                <Label>Item Display Name: {sampleItem?.displayName}</Label>
                            )}
                            {sampleItem && (
                                <Label>Item Description: {sampleItem?.description}</Label>
                            )}
                        </div>
                        <Divider alignContent="start">Selected Lakehouse Details</Divider>
                        <div className="section">
                            <Stack horizontal>
                                <Field label="Lakehouse" orientation="horizontal" className="field">
                                    <Input
                                        size="small"
                                        placeholder="Lakehouse Name"
                                        style={{ marginLeft: "10px" }}
                                        value={selectedLakehouse ? selectedLakehouse.displayName : ""}
                                    />
                                </Field>
                                <Button
                                    style={{ width: "24px", height: "24px" }}
                                    icon={<Database16Regular />}
                                    appearance="primary"
                                    onClick={() => onCallDatahub()}
                                />
                            </Stack>
                            <Field label="Lakehouse ID" orientation="horizontal" className="field">
                                <Input size="small" placeholder="Lakehouse ID" value={selectedLakehouse ? selectedLakehouse.id : ""} />
                            </Field>
                        </div>
                        <Divider alignContent="start">Convert Operation Info</Divider>
                        <div className="section">
                           <Field label="Convert Service Endpoint" orientation="horizontal" className="field">
                                <Input
                                    size="small"
                                    type="text"
                                    placeholder="Convert service endpoint"
                                    value={convertServiceEndpoint}
                                    onChange={(e) => onConvertServiceEndpointInputChanged(e.target.value)}
                                />
                            </Field>
                            <Field label="Input Data" orientation="horizontal" className="field">
                                <Input
                                    size="small"
                                    type="text"
                                    placeholder="Input data file name"
                                    value={inputFileName}
                                    onChange={(e) => onInputFileNameInputChanged(e.target.value)}
                                />
                            </Field>
                            <Field label="Template" orientation="horizontal" className="field">
                                <Input
                                    size="small"
                                    type="text"
                                    placeholder="Template file name"
                                    value={templateFileName}
                                    onChange={(e) => onTemplateFileNameInputChanged(e.target.value)}
                                />
                            </Field>
                            <Button
                                appearance="primary"
                                icon={<TriangleRight20Regular />}
                                onClick={() => onConvertOperationClick()}>
                                Test Conversion
                            </Button>
                            <Field label="Response:" orientation="horizontal" className="field"> { convertResponse } </Field>
                        </div>
                        <Divider alignContent="start">Authentication</Divider>
                        <div className="section">
                            <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallNavigate("/Authentication")}>
                                Navigate to Authentication Page
                            </Button>
                        </div>
                    </span>
                )}
                {selectedTab == "api" && (
                    <span>
                        <TabList
                            className="tabListContainer"
                            defaultSelectedValue={selectedApiTab}
                            onTabSelect={(_, data: SelectTabData) => setSelectedApiTab(data.value)}>
                            <Tab value="apiNotification">Notification</Tab>
                            <Tab value="apiActionDialog">Action & Dialog</Tab>
                            <Tab value="apiPanelSettings">Panel & Settings</Tab>
                            <Tab value="apiNavigation">Navigation</Tab>
                        </TabList>
                        {selectedApiTab == "apiNotification" && (
                            <span>
                                {/* Notification API usage example */}
                                <div className="section">
                                    <Field label="Title" validationMessage={notificationValidationMessage} orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Notification Title" onChange={(e) => setNotificationTitle(e.target.value)} />
                                    </Field>
                                    <Field label="Message" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Notification Message" onChange={(e) => setNotificationMessage(e.target.value)} />
                                    </Field>
                                    <Stack horizontal tokens={{ childrenGap: 10 }}>
                                        <Button
                                            icon={<AlertOn24Regular />}
                                            appearance="primary"
                                            onClick={() => onCallNotification()}>
                                            Send Notification
                                        </Button>
                                        <Button onClick={() => onCallNotificationHide()}>Hide Notification</Button>
                                    </Stack>
                                </div>
                            </span>
                        )}
                        {selectedApiTab == "apiActionDialog" && (
                            <span>
                                {/* Action API usage example */}
                                <Divider alignContent="start">Action</Divider>
                                <div className="section">
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallExecuteAction()}>
                                        Execute an Action
                                    </Button>
                                </div>
                                {/* Dialog MessageBox API usage example */}
                                <Divider alignContent="start">Dialog Message Box</Divider>
                                <div className="section">
                                    <Field label="Box Title" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Title" onChange={(e) => setApiDialogMsgboxTitle(e.target.value)} />
                                    </Field>
                                    <Field label="Box Content" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Content..." onChange={(e) => setApiDialogMsgboxContent(e.target.value)} />
                                    </Field>
                                    <Combobox
                                        placeholder="Buttons count"
                                        onOptionSelect={(_, opt) => setApiDialogMsgboxButtonCount(Number.parseInt(opt.optionValue))}>
                                        {msgboxButtonCountOptions.map((option) => (
                                            <Option key={option}>{option}</Option>
                                        ))}
                                    </Combobox>
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallOpenMessageBox()}>
                                        Open Dialog Message Box
                                    </Button>
                                </div>
                                {/* Error Handling API usage example */}
                                <Divider alignContent="start">Error Handling</Divider>
                                <div className="section">
                                    <Field label="Error Title" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Error title" onChange={(e) => setApiErrorTitle(e.target.value)} />
                                    </Field>
                                    <Field label="Error Message" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Error message" onChange={(e) => setApiErrorMessage(e.target.value)} />
                                    </Field>
                                    <Field label="Error Request ID" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Request ID" onChange={(e) => setApiErrorRequestId(e.target.value)} />
                                    </Field>
                                    <Field label="Error Status Code" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Status Code" onChange={(e) => setApiErrorStatusCode(e.target.value)} />
                                    </Field>
                                    <Field label="Error Stack Trace" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Stack Trace" onChange={(e) => setApiErrorStackTrace(e.target.value)} />
                                    </Field>
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallOpenError()}>
                                        Open Error
                                    </Button>
                                </div>
                                <div className="section">
                                    <Field label="Error" orientation="horizontal" className="field">
                                        <Input size="small" placeholder="Error message" onChange={(e) => setApiErrorFailureMessage(e.target.value)} />
                                    </Field>
                                    <Field label="Error Status Code" orientation="horizontal" className="field">
                                        <Input
                                            size="small"
                                            type="number"
                                            placeholder="Error Status Code"
                                            onChange={(e) => setApiErrorFailureCode(e.target.valueAsNumber)}
                                        />
                                    </Field>
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallErrorFailureHandling()}>
                                        Call Request Failure Handling{" "}
                                    </Button>
                                </div>
                            </span>
                        )}
                        {selectedApiTab == "apiPanelSettings" && (
                            <span>
                                {/* Panel API usage example */}
                                <Divider alignContent="start">Panel</Divider>
                                <div className="section">
                                    <Switch label="Clicking outside of Panel closes it" onChange={(e) => setApiPanelIsLightDismiss(e.target.checked)} />
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallOpenPanel()}>
                                        Open Panel
                                    </Button>
                                </div>
                                {/* Theme API usage example */}
                                <Divider alignContent="start">Theme</Divider>
                                <div className="section">
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallThemeGet()}>
                                        Get Theme Settings
                                    </Button>
                                </div>
                                {/* Settings API usage example */}
                                <Divider alignContent="start">Settings</Divider>
                                <div className="section">
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallSettingsGet()}>
                                        Get Workload Settings
                                    </Button>
                                </div>
                            </span>
                        )}
                        {selectedApiTab == "apiNavigation" && (
                            <span>
                                {/* Navigation and Page API usage example */}
                                <Divider alignContent="start">Navigation</Divider>
                                <div className="section">
                                    <Label>After navigation to a sample page, an AfterNavigateAway callback should show some notification</Label>
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallOpenPage()}>
                                        Open Sample Page
                                    </Button>
                                    <Button appearance="primary" icon={<PanelRightExpand20Regular />} onClick={() => onCallNavigate("/sample-page")}>
                                        Navigate to Sample Page
                                    </Button>
                                    <Label />
                                    <Label>
                                        BeforeNavigateAway callback has been registerd to block navigation to a 'forbidden-url'. Clicking the below should NOT
                                        navigate away"
                                    </Label>
                                    <Button
                                        appearance="primary"
                                        icon={<PanelRightExpand20Regular />}
                                        onClick={() => onCallNavigate("/sample-forbidden-url-page")}>
                                        Attempt to navigate to a Forbidden URL
                                    </Button>
                                </div>
                            </span>
                        )}
                    </span>
                )}
                {selectedTab == "fluentui" && (
                    <span>
                        {/* List of common UI Components */}
                        <Divider alignContent="start">Components</Divider>
                        <div className="section">
                            {/* Label and Input */}
                            <Stack
                                horizontal
                                tokens={{ childrenGap: 10 }}
                                style={{ padding: "10px" }}>
                                <Label htmlFor={inputId}>Sample input</Label>
                                <Input id={inputId} size="small" placeholder="hint" />
                            </Stack>
                            {/* Buttons */}
                            <Stack horizontal tokens={{ childrenGap: 10 }} style={{ padding: "10px" }}>
                                <Button icon={<Save24Regular />} appearance="primary">
                                    Primary
                                </Button>
                                <Button icon={<Save24Regular />} appearance="secondary">
                                    Default
                                </Button>
                                <Button icon={<Save24Regular />} appearance="outline">
                                    Outline
                                </Button>
                                <Button icon={<Save24Regular />} appearance="subtle">
                                    Subtle
                                </Button>
                            </Stack>
                            {/* Checkbox, Switch and Radio */}
                            <Checkbox title="my title" label="Checkbox sample" />
                            <Switch label="Switch sample" />
                            <Label id={labelId}>Radio group</Label>
                            <RadioGroup aria-labelledby={labelId} defaultValue="option1">
                                <Radio name={radioName} value="option1" label="Option 1" />
                                <Radio name={radioName} value="option2" label="Option 2" />
                                <Radio name={radioName} value="option3" label="Option 3" />
                            </RadioGroup>
                        </div>
                        <Divider alignContent="start">Example of Lakehouse Explorer</Divider>
                        <div className="section">
                            <LakehouseExplorerComponent workloadClient={workloadClient} />
                        </div>
                    </span>
                )}
            </Stack>
        </Stack>
    );
}

// A sample Page for showcasing workloadClient.navigation Navigate/OnNavigate/OnBeforeNavigateAway/OnAfterNavigateAway amd page.Open
export function SamplePage({ workloadClient }: PageProps) {
    return (
        <Stack className="editor">
            <Stack className="main">
                {/* TODO - fix Navigate Back - sample page needs to get workspaceObjectId, and then use it when navigating back */}
                <Button
                    onClick={() =>
                        callNavigationNavigate(
                            "workload",
                            "/convert-workload-editor",
                            workloadClient
                        )
                    }>
                    Navigate Back
                </Button>
            </Stack>
        </Stack>
    );
}
