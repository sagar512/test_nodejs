/****************************
 SEED DATA
 ****************************/
const _ = require("lodash");

const EmailTemplate = require('../modules/EmailTemplate/Schema').EmailTemplate;
//const PermissionCategorysSchema = require('../modules/Roles/Schema').PermissionCategorysSchema;
//const PermissionsSchema = require('../modules/Roles/Schema').PermissionsSchema;
//const RolesSchema = require('../modules/Roles/Schema').RolesSchema;
const Admin = require('../modules/Admin/Schema').Admin;
const Model = require("../modules/Base/Model");
const CommonService = require("./Common");

class Seed {

    constructor() { }

    async seedData() {
        try {
            this.addEmailTemplate();
            this.addPermissionCategories();
            // this.addAdmin();
        } catch (error) {
            console.log('error', error);
        }
    }
    async addEmailTemplate() {
        try {
            let registerMail = {
                "emailTitle": "Signup mail",
                'emailKey': "signup_mail",
                'subject': "Welcome Message",
                'emailContent': "<p><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Congratulations {{{fullName}}} for signing up with App. Your experience with us is the highest priority. We welcome you to get to know our company and its features. </span><br><br><a href=\"{{{verificationLink}}}\" target=\"_self\"><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Click link to verify your account</span></a><br><br></p>"
            };
            let isKeyExist = await EmailTemplate.findOne({ where: { emailKey: registerMail['emailKey'] } });
            if (_.isEmpty(isKeyExist)) {
                await EmailTemplate.create(registerMail);
            }
            let forgotPasswordMail = {
                "emailTitle": "Reset password",
                'emailKey': "forgot_password_mail",
                'subject': "Reset password",
                'emailContent': "<p><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Dear {{{fullName}}}, click below link to reset password. </span><br><br><a href=\"{{{resetPasswordLink}}}\" target=\"_self\"><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Click link to reset password</span></a><br><br></p>"
            };
            isKeyExist = await EmailTemplate.findOne({ where: { emailKey: forgotPasswordMail['emailKey'] } });
            if (_.isEmpty(isKeyExist)) {
                await EmailTemplate.create(forgotPasswordMail);
            }
            let adminUserInviteMail = {
                "emailTitle": "Admin invite mail",
                'emailKey': "admin_invite_mail",
                'subject': "Admin Welcome Message",
                'emailContent': "<p><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Dear {{{fullName}}} . You were added as {{{role}}}. </span><br><br><a href=\"{{{verificationLink}}}\" target=\"_self\"><span style=\"color: rgb(0,0,0);font-size: 13px;font-family: Arial;\">Click link to set password for your account</span></a><br><br></p>"
            };
            isKeyExist = await EmailTemplate.findOne({ where: { emailKey: adminUserInviteMail['emailKey'] } });
            if (_.isEmpty(isKeyExist)) {
                await EmailTemplate.create(adminUserInviteMail);
            }
            return;
        } catch (error) {
            console.log('error', error);
            return;
        }
    }
    async addPermissionCategories() {
        try {
            let categoryPermission = [
                {
                    category: 'User',
                    permission: [
                        { permission: 'View List', permissionKey: 'user_view_list' },
                        { permission: 'Delete', permissionKey: 'user_delete' },
                        { permission: 'Status Update', permissionKey: 'user_status_update' },
                        { permission: 'View Details', permissionKey: 'user_view_details' },
                        { permission: "Download", permissionKey: "user_download" }
                    ]
                }, {
                    category: 'Admin User',
                    permission: [
                        { permission: 'View List', permissionKey: 'admin_user_view_list' },
                        { permission: 'Download', permissionKey: 'admin_user_download' },
                        { permission: 'Create', permissionKey: 'admin_user_create' },
                        { permission: 'Edit', permissionKey: 'admin_user_edit' },
                        { permission: 'Delete', permissionKey: 'admin_user_delete' },
                        { permission: 'Status Update', permissionKey: 'admin_user_status_update' }
                    ]
                },
                {
                    category: 'Cms Pages',
                    permission: [
                        { permission: 'View List', permissionKey: 'cms_pages_view_list' },
                        { permission: 'Create', permissionKey: 'cms_pages_create' },
                        { permission: 'Edit', permissionKey: 'cms_pages_edit' },
                        { permission: 'Delete', permissionKey: 'cms_pages_delete' }
                    ]
                },
                {
                    category: 'Roles',
                    permission: [
                        { permission: 'View List', permissionKey: 'roles_view_list' },
                        { permission: 'Create', permissionKey: 'roles_create' },
                        { permission: 'Edit', permissionKey: 'roles_edit' },
                        { permission: 'Status Update', permissionKey: 'roles_status_update' }
                    ]
                },
                {
                    category: 'Email Template',
                    permission: [
                        { permission: 'View List', permissionKey: 'email_template_view_list' },
                        { permission: 'Create', permissionKey: 'email_template_create' },
                        { permission: 'Edit', permissionKey: 'email_template_edit' },
                        { permission: 'Delete', permissionKey: 'email_template_delete' },
                        { permission: 'Status Update', permissionKey: 'email_template_status_update' }
                    ]
                },
                {
                    category: 'Email Settings',
                    permission: [
                        { permission: "Edit Default Settings", permissionKey: "email_settings_edit_default_settings" },
                        { permission: "View List", permissionKey: "email_settings_view_list" },
                        { permission: "Create", permissionKey: "email_settings_create" },
                        { permission: "Edit", permissionKey: "email_settings_edit" },
                        { permission: "Delete", permissionKey: "email_settings_delete" }
                    ]
                },
            ];
            let superAdminPermissions = [];
            await this.asyncForEach(categoryPermission, async (categoryObj) => {
                let category = await PermissionCategorysSchema.findOne({ where: { category: categoryObj.category } });
                if (_.isEmpty(category)) {
                    category = await PermissionCategorysSchema.create({ category: categoryObj.category, status: true });
                }

                if (category && category.id) {
                    await this.asyncForEach(categoryObj.permission, async (permissionObj) => {
                        let permission = await PermissionsSchema.findOne({ where: { categoryId: category.id, permissionKey: permissionObj.permissionKey } });
                        if (_.isEmpty(permission)) {
                            permission = await PermissionsSchema.create({ categoryId: category.id, ...permissionObj });
                        }
                        if (permission && permission.id) {
                            superAdminPermissions.push(permission);
                        }
                    });
                }
            });

            let role = await RolesSchema.findOne({ where: { role: 'Super Admin' } });
            if (_.isEmpty(role)) {
                role = await RolesSchema.create({ role: 'Super Admin', status: true, isDeleted: false });
            }
            await role.setPermissions([]); // Un-associate all previously associated roles
            await role.addPermissions(superAdminPermissions);

            if (role && role.id) {
                let admin = await Admin.findOne({ where: { emailId: "seed_admin@grr.la" } });
                if (!admin) {
                    let password = "Test1234";
                    password = await (new CommonService()).ecryptPassword({ password: password });
                    let data = {
                        "firstname": "Admin",
                        "lastname": "Admin",
                        "mobile": "+91-0000000000",
                        "emailId": "seed_admin@grr.la",
                        "password": password,
                        "roleId": role.id,
                        "status": true,
                        "emailVerificationStatus": true,
                    };
                    await Admin.create(data);
                }
            }
            return;
        } catch (error) {
            console.log('error', error);
            return;
        }
    }
    async addAdmin() {
        try {
            let admin = await Admin.findOne({ where: { emailId: "seed_admin@grr.la" } });
            if (!admin) {
                let password = "Test1234";
                password = await (new CommonService()).ecryptPassword({ password: password });
                let data = {
                    "firstname": "Admin",
                    "lastname": "Admin",
                    "mobile": "+91-0000000000",
                    "emailId": "seed_admin@grr.la",
                    "password": password,
                    "status": true,
                    "emailVerificationStatus": true,
                };
                await Admin.create(data);
            }
            return;
        } catch (error) {
            console.log('error', error);
            return;
        }
    }
    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
}

module.exports = Seed;