import {Hook} from "@App/internal/utils/hook";
import "../../views/common";
import {Application} from "@App/internal/application";
import {TaskFactory} from "@App/mooc/course163/task";
import {Task} from "@App/internal/app/task";
import {UntrustedClick} from "@App/internal/utils/utils";
import {Mooc} from "@App/internal/app/mooc";

export class Course163 implements Mooc {

    protected lastTask: Task;

    public Init(): void {
        this.hookAjax();
    }

    protected hookAjax() {
        Hook.HookAjaxRespond(["CourseBean.getLessonUnitLearnVo.dwr", "MocQuizBean.getQuizPaperDto.dwr", "PostBean.getPaginationReplys.dwr"], (url, resp) => {
            let task = TaskFactory.CreateTask(url, resp);
            if (task) {
                setTimeout(async () => {
                    clearInterval(this.delayTimer);
                    this.lastTask && await this.lastTask.Stop();
                    this.lastTask = task;
                    // this.lastTask.addEventListener("complete", () => {
                    //     this.delay(async () => {
                    //         await this.lastTask.Submit();
                    //         this.nextTask();
                    //     });
                    // });
                    await this.lastTask.Init();
                    if (Application.App.config.auto) {
                        let autonext = <HTMLInputElement>document.querySelector(".j-autoNext");
                        if (autonext && autonext.checked) {
                            UntrustedClick(autonext);
                        }
                        await this.lastTask.Start();
                    }
                }, 0);
            }
            return resp;
        });
        Hook.HookAjaxRespond("MocQuizBean.fetchQuestions", (url, resp) => {
            if (resp.indexOf("{questions:s0}") > 0) {
                resp = resp.replace("{questions:s0}", "{questions:{}}");
            }
            return resp;
        })
    }

    protected nextTask() {
        let unit = document.querySelectorAll(".j-unitslist.unitslist.f-cb > .f-fl");
        let ret = this.next(unit, (el) => {
            return el.className.indexOf("current") > 0;
        });
        if (ret) {
            return UntrustedClick(ret);
        }
        //二级
        let tmp = (type: string) => {
            let now = document.querySelector(".f-fl.j-" + type + " .up.j-up.f-thide");
            let all = document.querySelectorAll(".f-fl.j-" + type + " .f-bg.j-list > .f-thide");
            return this.next(all, (el) => {
                //什么魔鬼,空格不同
                return (<HTMLSpanElement>el).innerText.replace(/\s/g, "") == (<HTMLSpanElement>now).innerText.replace(/\s/g, "");
            });
        };
        ret = tmp("lesson");
        if (ret) {
            return UntrustedClick(ret);
        }
        //顶层
        ret = tmp("chapter");
        if (ret) {
            UntrustedClick(ret);
            let all = document.querySelectorAll(".f-fl.j-lesson .f-bg.j-list > .f-thide");
            return UntrustedClick(all[0]);
        }
        Application.App.log.Warn("任务结束了");
        return alert("任务结束了");
    }

    protected next(all: NodeListOf<Element>, ok: (el: Element) => boolean): Element {
        let flag = false;
        for (let i = 0; i < all.length; i++) {
            if (ok(all[i])) {
                flag = true;
            } else if (flag) {
                return all[i];
            }
        }
        return null;
    }

    protected delayTimer: NodeJS.Timer;

    protected delay(func: Function) {
        let interval = Application.App.config.interval;
        Application.App.log.Info(interval + "分钟后自动切换下一个任务点");
        this.delayTimer = setTimeout(() => {
            Application.App.config.auto && func();
        }, interval * 60000);
    }

}