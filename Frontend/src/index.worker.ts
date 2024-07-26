import {
    ItemCreateContext,
    createWorkloadClient,
    DialogType,
    InitParams,
    NotificationToastDuration,
    NotificationType,
} from '@ms-fabric/workload-client';

import * as Controller from './controller/ConvertWorkloadController';
import { ItemActionContext, ItemJobActionContext } from './models/ConvertWorkloadModel';
import { getJobDetailsPane } from './utils';

export async function initialize(params: InitParams) {

    const workloadClient = createWorkloadClient();
    const convertWorkloadName = process.env.WORKLOAD_NAME;
    const convertItemType = convertWorkloadName + ".ConvertWorkloadItem";
    const convertOperation = convertItemType + ".ConvertOperation";

    workloadClient.action.onAction(async function ({ action, data }) {
        switch (action) {
            /* This is the entry point for the Convert Workload Create experience, 
            as referenced by the Product->CreateExperience->Cards->onClick->action 'open.createSampleWorkload' in the localWorkloadManifest.json manifest.
             This will open a Save dialog, and after a successful creation, the editor experience of the saved sampleWorkload item will open
            */
            case 'open.createConvertWorkload':
                const { workspaceObjectId } = data as ItemCreateContext;
                console.log(`Received open.createConvertWorkload action with workspaceObjectId: ${workspaceObjectId}`);
                return workloadClient.dialog.open({
                    workloadName: convertWorkloadName,
                    dialogType: DialogType.IFrame,
                    route: {
                        path: `/convert-workload-create-dialog/${workspaceObjectId}`,
                    },
                    options: {
                        width: 360,
                        height: 360,
                        hasCloseButton: false
                    },
                });

            /**
             * This opens the Frontend-only experience, allowing to experiment with the UI without the need for CRUD operations.
             * This experience still allows saving the item, if the Backend is connected and registered
             */
            case 'open.createSampleWorkloadFrontendOnly':
                return workloadClient.page.open({
                    workloadName: convertWorkloadName,
                    route: {
                        path: `/sample-workload-frontend-only`,
                    },
                });

            case 'sample.Action':
                return Controller.callNotificationOpen(
                    'Action executed',
                    'Action executed via API',
                    NotificationType.Success,
                    NotificationToastDuration.Medium,
                    workloadClient);

            case 'run.calculate.job':
            case 'run.convert.job':
                const { item } = data as ItemActionContext;
                return await Controller.callRunItemJob(
                    item.objectId, 
                    convertOperation, 
                    JSON.stringify({metadata: 'JobMetadata'}), 
                    workloadClient, 
                    true /* showNotification */);

            case 'item.job.retry':
                const retryJobContext = data as ItemJobActionContext;
                return await Controller.callRunItemJob(
                    retryJobContext.itemObjectId,
                    retryJobContext.itemJobType,
                    JSON.stringify({ metadata: 'JobMetadata' }),
                    workloadClient,
                    true /* showNotification */);

            case 'item.job.cancel':
                const cancelJobDetails = data as ItemJobActionContext;
                return await Controller.callCancelItemJob(cancelJobDetails.itemObjectId, cancelJobDetails.itemJobInstanceId, workloadClient, true);

            case 'item.job.detail':
                const jobDetailsContext = data as ItemJobActionContext;
                const hostUrl = (await Controller.callSettingsGet(workloadClient)).workloadHostOrigin;
                return getJobDetailsPane(jobDetailsContext, hostUrl);

            default:
                throw new Error('Unknown action received');
        }
    });
}
